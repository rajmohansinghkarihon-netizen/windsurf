import { useState } from 'react';
import { ExternalLink, Save, Eye, EyeOff, X } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useUIStore } from '../../store/uiStore';
import { PROVIDERS } from '../../services/ai/providers';
import { saveConfigToStore } from '../../services/tauri';
import type { AIProvider, AppConfig } from '../../types';

type SettingsTab = 'ai' | 'editor' | 'appearance' | 'keybindings' | 'rules';

export default function SettingsPanel() {
  const config = useSettingsStore((s) => s.config);
  const setConfig = useSettingsStore((s) => s.setConfig);
  const setShowSettings = useUIStore((s) => s.setShowSettings);
  const [local, setLocal] = useState<AppConfig>({ ...config });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

  const provider = PROVIDERS[local.provider];

  const handleSave = async () => {
    try {
      await saveConfigToStore(local);
      setConfig(local);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(`Failed to save: ${err}`);
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'ai', label: 'AI Providers' },
    { id: 'editor', label: 'Editor' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'keybindings', label: 'Keybindings' },
    { id: 'rules', label: 'Project Rules' },
  ];

  return (
    <div className="settings-overlay" onClick={() => setShowSettings(false)}>
      <div className="settings-panel wide" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={() => setShowSettings(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`settings-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {activeTab === 'ai' && (
            <>
              <div className="settings-section">
                <h3>Default Provider</h3>
                <div className="settings-providers">
                  {(Object.entries(PROVIDERS) as [AIProvider, typeof provider][]).map(([key, p]) => (
                    <button
                      key={key}
                      className={`provider-btn ${local.provider === key ? 'active' : ''}`}
                      onClick={() => setLocal({ ...local, provider: key, model: p.defaultModel })}
                    >
                      <span className="provider-name">{p.name}</span>
                      <span className="provider-hint">{key === 'ollama' ? 'LOCAL' : key === 'openai' ? '$' : 'API'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <h3>API Key — {provider?.name}</h3>
                <div className="api-key-input">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={local.api_key}
                    onChange={(e) => setLocal({ ...local, api_key: e.target.value })}
                    placeholder={local.provider === 'ollama' ? 'Not required for local models' : `Paste your ${provider?.keyLabel}`}
                  />
                  <button className="icon-btn" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {provider?.getKeyUrl && local.provider !== 'ollama' && (
                  <a className="get-key-link" href={provider.getKeyUrl} target="_blank" rel="noopener noreferrer">
                    Get API key <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div className="settings-section">
                <h3>Model</h3>
                <select
                  className="settings-select"
                  value={local.model}
                  onChange={(e) => setLocal({ ...local, model: e.target.value })}
                >
                  {provider?.models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="settings-input"
                  value={local.model}
                  onChange={(e) => setLocal({ ...local, model: e.target.value })}
                  placeholder="Or type a custom model name"
                />
              </div>

              {local.provider === 'ollama' && (
                <div className="settings-section">
                  <h3>Ollama Server URL</h3>
                  <input
                    type="text"
                    className="settings-input"
                    value={local.ollamaUrl}
                    onChange={(e) => setLocal({ ...local, ollamaUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                  />
                </div>
              )}

              <div className="settings-section">
                <h3>Ghost Text (AI Completion)</h3>
                <label className="settings-toggle-label">
                  <input
                    type="checkbox"
                    checked={local.ghostText}
                    onChange={(e) => setLocal({ ...local, ghostText: e.target.checked })}
                  />
                  Enable AI-powered ghost text suggestions while typing
                </label>
              </div>
            </>
          )}

          {activeTab === 'editor' && (
            <>
              <div className="settings-section">
                <h3>Font Size</h3>
                <input
                  type="number"
                  className="settings-input small"
                  value={local.fontSize}
                  onChange={(e) => setLocal({ ...local, fontSize: parseInt(e.target.value) || 14 })}
                  min={10}
                  max={24}
                />
              </div>

              <div className="settings-section">
                <h3>Font Family</h3>
                <input
                  type="text"
                  className="settings-input"
                  value={local.fontFamily}
                  onChange={(e) => setLocal({ ...local, fontFamily: e.target.value })}
                />
              </div>

              <div className="settings-section">
                <h3>Tab Size</h3>
                <select
                  className="settings-select"
                  value={local.tabSize}
                  onChange={(e) => setLocal({ ...local, tabSize: parseInt(e.target.value) })}
                >
                  <option value={2}>2 Spaces</option>
                  <option value={4}>4 Spaces</option>
                  <option value={8}>8 Spaces</option>
                </select>
              </div>

              <div className="settings-section">
                <h3>Editor Options</h3>
                <label className="settings-toggle-label">
                  <input type="checkbox" checked={local.wordWrap} onChange={(e) => setLocal({ ...local, wordWrap: e.target.checked })} />
                  Word Wrap
                </label>
                <label className="settings-toggle-label">
                  <input type="checkbox" checked={local.minimap} onChange={(e) => setLocal({ ...local, minimap: e.target.checked })} />
                  Show Minimap
                </label>
                <label className="settings-toggle-label">
                  <input type="checkbox" checked={local.lineNumbers} onChange={(e) => setLocal({ ...local, lineNumbers: e.target.checked })} />
                  Show Line Numbers
                </label>
              </div>

              <div className="settings-section">
                <h3>Auto Save</h3>
                <label className="settings-toggle-label">
                  <input type="checkbox" checked={local.autoSave} onChange={(e) => setLocal({ ...local, autoSave: e.target.checked })} />
                  Enable Auto Save
                </label>
                {local.autoSave && (
                  <div className="settings-inline">
                    <span>Delay (ms):</span>
                    <input
                      type="number"
                      className="settings-input small"
                      value={local.autoSaveDelay}
                      onChange={(e) => setLocal({ ...local, autoSaveDelay: parseInt(e.target.value) || 1000 })}
                      min={500}
                      max={10000}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h3>Theme</h3>
              <div className="theme-toggle">
                <button className={`theme-btn ${local.theme === 'dark' ? 'active' : ''}`} onClick={() => setLocal({ ...local, theme: 'dark' })}>
                  Dark
                </button>
                <button className={`theme-btn ${local.theme === 'light' ? 'active' : ''}`} onClick={() => setLocal({ ...local, theme: 'light' })}>
                  Light
                </button>
              </div>
            </div>
          )}

          {activeTab === 'keybindings' && (
            <div className="settings-section">
              <h3>Keyboard Shortcuts</h3>
              <p className="settings-hint">Keybinding customization is available through the keybindings editor.</p>
              <button className="btn-secondary" onClick={() => {
                setShowSettings(false);
                useUIStore.getState().setShowKeybindings(true);
              }}>
                Open Keybindings Editor
              </button>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="settings-section">
              <h3>Project Rules</h3>
              <p className="settings-hint">Custom instructions that will be included in every AI prompt for this project.</p>
              <textarea
                className="settings-textarea"
                value={local.projectRules}
                onChange={(e) => setLocal({ ...local, projectRules: e.target.value })}
                placeholder="e.g., Use TypeScript strict mode. Follow Airbnb style guide. Use functional components..."
                rows={8}
              />
            </div>
          )}
        </div>

        <div className="settings-actions">
          <button className="btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={14} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
