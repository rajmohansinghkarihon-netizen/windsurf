import { useCallback, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { streamLlm, type StreamRequest } from '../services/tauri';

interface StreamToken {
  stream_id: string;
  token: string;
  done: boolean;
  error: string | null;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string, usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
  onError: (error: string) => void;
}

export function useRustStreaming() {
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const fullTextRef = useRef('');

  const startStream = useCallback(async (request: StreamRequest, callbacks: StreamCallbacks) => {
    fullTextRef.current = '';

    if (unlistenRef.current) {
      unlistenRef.current();
    }

    unlistenRef.current = await listen<StreamToken>('llm-stream', (event) => {
      const data = event.payload;
      if (data.stream_id !== request.stream_id) return;

      if (data.error) {
        callbacks.onError(data.error);
        return;
      }

      if (data.token) {
        fullTextRef.current += data.token;
        callbacks.onToken(data.token);
      }

      if (data.done) {
        callbacks.onComplete(
          fullTextRef.current,
          data.usage ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          } : undefined
        );
        if (unlistenRef.current) {
          unlistenRef.current();
          unlistenRef.current = null;
        }
      }
    });

    await streamLlm(request);
  }, []);

  const abort = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
  }, []);

  return { startStream, abort };
}
