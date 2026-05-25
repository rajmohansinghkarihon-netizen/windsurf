import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Download, Check, Loader2, Server } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

interface OllamaModel {
  name: string;
  size: string;
  modified: string;
  status: 'available' | 'downloading' | 'not_installed';
}

const RECOMMENDED_MODELS: Array<{ name: string; description: string; size: string }> = [
  { name: 'llama3.1', description: 'Meta Llama 3.1 - General purpose', size: '4.7 GB' },
  { name: 'codellama', description: 'Code Llama - Code generation', size: '3.8 GB' },
  { name: 'deepseek-coder-v2', description: 'DeepSeek Coder V2 - Code focused', size: '8.9 GB' },
  { name: 'qwen2.5-coder', description: 'Qwen 2.5 Coder - Code assistant', size: '4.4 GB' },
  { name: 'mistral', description: 'Mistral 7B - Fast and efficient', size: '4.1 GB' },
  { name: 'phi3', description: 'Microsoft Phi-3 - Compact and fast', size: '2.2 GB' },
];

export default function LocalFirstMode() {
  const config = useSettingsStore((s) => s.config);
  const updateConfig = useSettingsStore((s) => s.updateConfig);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ollamaRunning, setOllamaRunning] = useState(false);
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState('');

  const checkOnline = useCallback(() => {
    setIsOnline(navigator.onLine);
  }, []);

  const checkOllama = useCallback(async () => {
    const ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
    try {
      const resp = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        setOllamaRunning(true);
        const data = await resp.json() as { models?: Array<{ name: string; size: number; modified_at: string }> };
        const models: OllamaModel[] = (data.models || []).map((m) => ({
          name: m.name,
          size: formatBytes(m.size),
          modified: new Date(m.modified_at).toLocaleDateString(),
          status: 'available' as const,
        }));
        setInstalledModels(models);
      }
    } catch {
      setOllamaRunning(false);
      setInstalledModels([]);
    }
  }, [config.ollamaUrl]);

  useEffect(() => {
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);
    const handle = requestAnimationFrame(() => { checkOllama(); });
    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
      cancelAnimationFrame(handle);
    };
  }, [checkOnline, checkOllama]);

  const goOffline = () => {
    updateConfig({
      provider: 'ollama',
      model: installedModels.length > 0 ? installedModels[0].name : 'llama3.1',
    });
  };

  const goOnline = () => {
    updateConfig({ provider: 'gemini', model: 'gemini-2.0-flash' });
  };

  const pullModel = async (modelName: string) => {
    setPullingModel(modelName);
    setPullProgress('Starting download...');
    const ollamaUrl = config.ollamaUrl || 'http://localhost:11434';

    try {
      const resp = await fetch(`${ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!resp.ok) {
        setPullProgress(`Error: ${resp.statusText}`);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const text = decoder.decode(value);
          const lines = text.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const data = JSON.parse(line) as { status?: string; completed?: number; total?: number };
              if (data.total && data.completed) {
                const pct = ((data.completed / data.total) * 100).toFixed(1);
                setPullProgress(`${data.status || 'Downloading'}: ${pct}%`);
              } else {
                setPullProgress(data.status || 'Downloading...');
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      setPullProgress('Complete!');
      await checkOllama();
    } catch (err) {
      setPullProgress(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTimeout(() => {
        setPullingModel(null);
        setPullProgress('');
      }, 2000);
    }
  };

  const isInstalled = (name: string) =>
    installedModels.some((m) => m.name === name || m.name.startsWith(`${name}:`));

  return (
    <div className="local-first-mode">
      <div className="local-first-header">
        <Server size={16} />
        <h4>Local-First AI Mode</h4>
        <span className={`online-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? <><Wifi size={12} /> Online</> : <><WifiOff size={12} /> Offline</>}
        </span>
      </div>

      <div className="local-first-actions">
        {config.provider === 'ollama' ? (
          <button className="btn-secondary" onClick={goOnline} disabled={!isOnline}>
            <Wifi size={14} /> Go Online
          </button>
        ) : (
          <button className="btn-primary" onClick={goOffline} disabled={!ollamaRunning}>
            <WifiOff size={14} /> Go Offline (Ollama)
          </button>
        )}
      </div>

      <div className="ollama-status">
        <div className={`status-indicator ${ollamaRunning ? 'running' : 'stopped'}`}>
          {ollamaRunning ? 'Ollama Running' : 'Ollama Not Running'}
        </div>
        {!ollamaRunning && (
          <p className="help-text">
            Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a> and run <code>ollama serve</code>
          </p>
        )}
        <button className="btn-secondary small" onClick={checkOllama}>Refresh</button>
      </div>

      {ollamaRunning && (
        <>
          <div className="installed-models">
            <h5>Installed Models</h5>
            {installedModels.length === 0 ? (
              <p className="help-text">No models installed. Pull a model below.</p>
            ) : (
              installedModels.map((model) => (
                <div key={model.name} className="model-row installed">
                  <Check size={14} className="text-green" />
                  <span className="model-name">{model.name}</span>
                  <span className="model-size">{model.size}</span>
                  <button
                    className="btn-secondary small"
                    onClick={() => updateConfig({ provider: 'ollama', model: model.name })}
                    disabled={config.provider === 'ollama' && config.model === model.name}
                  >
                    {config.provider === 'ollama' && config.model === model.name ? 'Active' : 'Use'}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="available-models">
            <h5>Recommended Models</h5>
            {RECOMMENDED_MODELS.map((model) => (
              <div key={model.name} className="model-row">
                <span className="model-name">{model.name}</span>
                <span className="model-description">{model.description}</span>
                <span className="model-size">{model.size}</span>
                {isInstalled(model.name) ? (
                  <span className="installed-badge"><Check size={12} /> Installed</span>
                ) : (
                  <button
                    className="btn-primary small"
                    onClick={() => pullModel(model.name)}
                    disabled={pullingModel !== null}
                  >
                    {pullingModel === model.name ? (
                      <><Loader2 size={12} className="spin" /> {pullProgress}</>
                    ) : (
                      <><Download size={12} /> Pull</>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}
