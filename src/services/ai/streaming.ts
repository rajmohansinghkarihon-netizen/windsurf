import type { AIProvider, LlmRequest, TokenUsage } from '../../types';
import { getProviderConfig } from './providers';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string, usage?: TokenUsage) => void;
  onError: (error: string) => void;
}

export async function streamCompletion(
  request: LlmRequest,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const provider = request.provider as AIProvider;
  const config = getProviderConfig(provider);

  try {
    if (provider === 'gemini') {
      await streamGemini(request, callbacks, abortSignal);
    } else if (provider === 'anthropic') {
      await streamAnthropic(request, callbacks, abortSignal);
    } else {
      await streamOpenAICompatible(request, config.baseUrl, callbacks, abortSignal);
    }
  } catch (err) {
    if (abortSignal?.aborted) return;
    callbacks.onError(err instanceof Error ? err.message : String(err));
  }
}

async function streamOpenAICompatible(
  request: LlmRequest,
  baseUrl: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const messages: Array<{role: string; content: string | Array<{type: string; text?: string; image_url?: {url: string}}>}> = [
    { role: 'system', content: request.system_prompt },
  ];

  if (request.images && request.images.length > 0) {
    const content: Array<{type: string; text?: string; image_url?: {url: string}}> = [
      { type: 'text', text: request.user_prompt },
      ...request.images.map((img) => ({
        type: 'image_url' as const,
        image_url: { url: img },
      })),
    ];
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: request.user_prompt });
  }

  const body = {
    model: request.model,
    messages,
    temperature: request.temperature ?? 0.3,
    max_tokens: request.max_tokens ?? 8192,
    stream: true,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (request.api_key) {
    headers['Authorization'] = `Bearer ${request.api_key}`;
  }

  if (request.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://zenith-ide.app';
    headers['X-Title'] = 'Zenith IDE';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          callbacks.onToken(delta);
        }

        if (json.usage) {
          callbacks.onComplete(fullText, {
            prompt_tokens: json.usage.prompt_tokens || 0,
            completion_tokens: json.usage.completion_tokens || 0,
            total_tokens: json.usage.total_tokens || 0,
          });
          return;
        }
      } catch {
        // skip malformed SSE
      }
    }
  }

  callbacks.onComplete(fullText);
}

async function streamGemini(
  request: LlmRequest,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:streamGenerateContent?alt=sse&key=${request.api_key}`;

  const parts: Array<{text?: string; inlineData?: {mimeType: string; data: string}}> = [
    { text: request.user_prompt },
  ];

  if (request.images) {
    for (const img of request.images) {
      const match = img.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      }
    }
  }

  const body = {
    system_instruction: { parts: [{ text: request.system_prompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: request.temperature ?? 0.3,
      maxOutputTokens: request.max_tokens ?? 8192,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          fullText += text;
          callbacks.onToken(text);
        }
      } catch {
        // skip
      }
    }
  }

  callbacks.onComplete(fullText);
}

async function streamAnthropic(
  request: LlmRequest,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const content: Array<{type: string; text?: string; source?: {type: string; media_type: string; data: string}}> = [
    { type: 'text', text: request.user_prompt },
  ];

  if (request.images) {
    for (const img of request.images) {
      const match = img.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: match[1], data: match[2] },
        });
      }
    }
  }

  const body = {
    model: request.model,
    system: request.system_prompt,
    messages: [{ role: 'user', content }],
    max_tokens: request.max_tokens ?? 8192,
    temperature: request.temperature ?? 0.3,
    stream: true,
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': request.api_key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let usage: TokenUsage | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));

        if (json.type === 'content_block_delta') {
          const delta = json.delta?.text;
          if (delta) {
            fullText += delta;
            callbacks.onToken(delta);
          }
        }

        if (json.type === 'message_delta' && json.usage) {
          usage = {
            prompt_tokens: 0,
            completion_tokens: json.usage.output_tokens || 0,
            total_tokens: json.usage.output_tokens || 0,
          };
        }

        if (json.type === 'message_start' && json.message?.usage) {
          const u = json.message.usage;
          usage = {
            prompt_tokens: u.input_tokens || 0,
            completion_tokens: 0,
            total_tokens: u.input_tokens || 0,
          };
        }
      } catch {
        // skip
      }
    }
  }

  callbacks.onComplete(fullText, usage);
}
