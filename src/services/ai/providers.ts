import type { AIProvider, ProviderConfig } from '../../types';

export const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
    keyLabel: 'OpenAI API Key',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    baseUrl: 'https://api.openai.com/v1',
    supportsStreaming: true,
    supportsVision: true,
  },
  anthropic: {
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    keyLabel: 'Anthropic API Key',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    baseUrl: 'https://api.anthropic.com/v1',
    supportsStreaming: true,
    supportsVision: true,
  },
  gemini: {
    name: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    keyLabel: 'Gemini API Key',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    supportsStreaming: true,
    supportsVision: true,
  },
  openrouter: {
    name: 'OpenRouter',
    defaultModel: 'anthropic/claude-sonnet-4-20250514',
    models: ['anthropic/claude-sonnet-4-20250514', 'openai/gpt-4o', 'google/gemini-2.0-flash-exp', 'meta-llama/llama-3.1-405b-instruct'],
    keyLabel: 'OpenRouter API Key',
    getKeyUrl: 'https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    supportsStreaming: true,
    supportsVision: true,
  },
  ollama: {
    name: 'Ollama (Local)',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'codellama', 'mistral', 'deepseek-coder-v2', 'qwen2.5-coder', 'phi3'],
    keyLabel: 'Not Required',
    getKeyUrl: 'https://ollama.ai/download',
    baseUrl: 'http://localhost:11434/v1',
    supportsStreaming: true,
    supportsVision: false,
  },
  groq: {
    name: 'Groq',
    defaultModel: 'llama-3.1-70b-versatile',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    keyLabel: 'Groq API Key',
    getKeyUrl: 'https://console.groq.com/keys',
    baseUrl: 'https://api.groq.com/openai/v1',
    supportsStreaming: true,
    supportsVision: false,
  },
};

export function getProviderConfig(provider: AIProvider): ProviderConfig {
  return PROVIDERS[provider];
}

export function getModelCostPerToken(provider: AIProvider, model: string): { input: number; output: number } {
  const costs: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.0000025, output: 0.00001 },
    'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
    'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
    'claude-sonnet-4-20250514': { input: 0.000003, output: 0.000015 },
    'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 },
    'claude-3-opus-20240229': { input: 0.000015, output: 0.000075 },
    'gemini-2.0-flash': { input: 0.0000001, output: 0.0000004 },
    'gemini-1.5-pro': { input: 0.00000125, output: 0.000005 },
  };
  return costs[model] || { input: 0.000001, output: 0.000002 };
}

export function estimateCost(provider: AIProvider, model: string, promptTokens: number, completionTokens: number): number {
  const cost = getModelCostPerToken(provider, model);
  return (promptTokens * cost.input) + (completionTokens * cost.output);
}
