import { useState } from 'react';
import { Puzzle, Download, Check, Search } from 'lucide-react';
import type { Extension } from '../../types';

const AVAILABLE_EXTENSIONS: Extension[] = [
  { id: 'python', name: 'Python', version: '2024.1.0', description: 'Python language support with IntelliSense and debugging', author: 'Zenith', enabled: false, category: 'language' },
  { id: 'rust', name: 'Rust Analyzer', version: '0.3.1', description: 'Rust language support via rust-analyzer', author: 'Zenith', enabled: false, category: 'language' },
  { id: 'go', name: 'Go', version: '0.41.0', description: 'Go language support with gopls', author: 'Zenith', enabled: false, category: 'language' },
  { id: 'docker', name: 'Docker', version: '1.29.0', description: 'Dockerfile and docker-compose support', author: 'Zenith', enabled: false, category: 'tool' },
  { id: 'prettier', name: 'Prettier', version: '10.4.0', description: 'Code formatting with Prettier', author: 'Zenith', enabled: false, category: 'tool' },
  { id: 'eslint', name: 'ESLint', version: '3.0.5', description: 'ESLint integration for JavaScript/TypeScript', author: 'Zenith', enabled: false, category: 'tool' },
  { id: 'catppuccin', name: 'Catppuccin Theme', version: '3.14.0', description: 'Soothing pastel theme for Zenith', author: 'Community', enabled: false, category: 'theme' },
  { id: 'dracula', name: 'Dracula Theme', version: '2.24.3', description: 'Official Dracula theme', author: 'Community', enabled: false, category: 'theme' },
  { id: 'github-copilot', name: 'AI Copilot Bridge', version: '1.0.0', description: 'Bridge to external AI completion providers', author: 'Zenith', enabled: false, category: 'ai' },
  { id: 'mcp', name: 'MCP Server Support', version: '1.0.0', description: 'Model Context Protocol server integration', author: 'Zenith', enabled: false, category: 'ai' },
];

export default function ExtensionsPanel() {
  const [extensions, setExtensions] = useState<Extension[]>(AVAILABLE_EXTENSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', 'language', 'tool', 'theme', 'ai'];

  const filtered = extensions.filter((ext) => {
    const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || ext.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExtension = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => ext.id === id ? { ...ext, enabled: !ext.enabled } : ext)
    );
  };

  const installed = extensions.filter((e) => e.enabled);

  return (
    <div className="extensions-panel">
      <div className="panel-header">
        <span>EXTENSIONS</span>
      </div>

      <div className="extensions-search">
        <Search size={14} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search extensions..."
        />
      </div>

      <div className="extensions-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`extension-category ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {installed.length > 0 && (
        <div className="extensions-section">
          <h4>Installed ({installed.length})</h4>
          {installed.map((ext) => (
            <div key={ext.id} className="extension-item installed">
              <div className="extension-icon">
                <Puzzle size={20} />
              </div>
              <div className="extension-info">
                <span className="extension-name">{ext.name}</span>
                <span className="extension-desc">{ext.description}</span>
                <span className="extension-meta">v{ext.version} by {ext.author}</span>
              </div>
              <button className="extension-toggle enabled" onClick={() => toggleExtension(ext.id)}>
                <Check size={14} /> Enabled
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="extensions-section">
        <h4>Available ({filtered.filter((e) => !e.enabled).length})</h4>
        {filtered.filter((e) => !e.enabled).map((ext) => (
          <div key={ext.id} className="extension-item">
            <div className="extension-icon">
              <Puzzle size={20} />
            </div>
            <div className="extension-info">
              <span className="extension-name">{ext.name}</span>
              <span className="extension-desc">{ext.description}</span>
              <span className="extension-meta">v{ext.version} by {ext.author}</span>
            </div>
            <button className="extension-toggle" onClick={() => toggleExtension(ext.id)}>
              <Download size={14} /> Install
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
