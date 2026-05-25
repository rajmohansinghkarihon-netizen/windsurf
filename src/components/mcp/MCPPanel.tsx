import React, { useState, useEffect, useCallback } from 'react';
import { Server, Plus, Trash2, RefreshCw, Plug, PlugZap, Settings2, Wrench } from 'lucide-react';
import { mcpClient } from '../../services/mcp/mcpClient';
import type { MCPServerConfig, MCPServerState } from '../../services/mcp/mcpClient';

export const MCPPanel: React.FC = () => {
  const [servers, setServers] = useState<MCPServerState[]>(() => mcpClient.getServers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<MCPServerConfig>>({
    name: '',
    transport: 'http',
    url: '',
    command: '',
    enabled: true,
  });

  const refreshServers = useCallback(() => {
    setServers(mcpClient.getServers());
  }, []);

  useEffect(() => {
    mcpClient.setStateChangeCallback(setServers);
  }, []);

  const addServer = async () => {
    if (!formData.name) return;
    const config: MCPServerConfig = {
      id: `mcp-${Date.now()}`,
      name: formData.name || '',
      transport: formData.transport || 'http',
      url: formData.url,
      command: formData.command,
      args: formData.command ? formData.command.split(' ').slice(1) : [],
      enabled: true,
    };
    await mcpClient.registerServer(config);
    setFormData({ name: '', transport: 'http', url: '', command: '', enabled: true });
    setShowAddForm(false);
  };

  const toggleServer = async (serverId: string) => {
    const server = servers.find((s) => s.config.id === serverId);
    if (!server) return;
    if (server.status === 'connected') {
      await mcpClient.disconnectServer(serverId);
    } else {
      await mcpClient.connectServer(serverId);
    }
  };

  const removeServer = async (serverId: string) => {
    await mcpClient.removeServer(serverId);
    if (selectedServer === serverId) setSelectedServer(null);
  };

  const selected = servers.find((s) => s.config.id === selectedServer);

  return (
    <div className="mcp-panel">
      <div className="mcp-header">
        <h4><Plug size={14} /> MCP Servers</h4>
        <div className="mcp-actions">
          <button onClick={refreshServers} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowAddForm(true)} title="Add Server">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="mcp-add-form">
          <input
            placeholder="Server name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <select
            value={formData.transport || 'http'}
            onChange={(e) => setFormData({ ...formData, transport: e.target.value as MCPServerConfig['transport'] })}
          >
            <option value="http">HTTP</option>
            <option value="stdio">stdio (local process)</option>
            <option value="websocket">WebSocket</option>
          </select>
          {formData.transport === 'http' || formData.transport === 'websocket' ? (
            <input
              placeholder="Server URL (e.g., http://localhost:3001)"
              value={formData.url || ''}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />
          ) : (
            <input
              placeholder="Command (e.g., npx @mcp/server)"
              value={formData.command || ''}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
            />
          )}
          <div className="mcp-form-actions">
            <button onClick={addServer}>Add Server</button>
            <button onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="mcp-server-list">
        {servers.length === 0 && !showAddForm ? (
          <div className="mcp-empty">
            <Server size={24} />
            <p>No MCP servers configured</p>
            <span>Add MCP servers to extend AI capabilities</span>
          </div>
        ) : (
          servers.map((server) => (
            <div
              key={server.config.id}
              className={`mcp-server-item ${selectedServer === server.config.id ? 'selected' : ''}`}
              onClick={() => setSelectedServer(server.config.id)}
            >
              <div className="mcp-server-info">
                <PlugZap
                  size={14}
                  className={server.status === 'connected' ? 'connected' : 'disconnected'}
                />
                <div>
                  <div className="mcp-server-name">{server.config.name}</div>
                  <div className="mcp-server-transport">{server.config.transport}</div>
                  <div className={`mcp-server-status ${server.status}`}>
                    {server.status}
                    {server.error && <span className="mcp-error"> - {server.error}</span>}
                  </div>
                </div>
              </div>
              <div className="mcp-server-item-actions">
                <button onClick={(e) => { e.stopPropagation(); toggleServer(server.config.id); }}>
                  {server.status === 'connected' ? <Plug size={12} /> : <PlugZap size={12} />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeServer(server.config.id); }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selected && selected.status === 'connected' && (
        <div className="mcp-server-details">
          <div className="mcp-detail-section">
            <h5><Wrench size={12} /> Tools ({selected.tools.length})</h5>
            {selected.tools.length === 0 ? (
              <span className="mcp-no-items">No tools available</span>
            ) : (
              selected.tools.map((tool) => (
                <div key={tool.name} className="mcp-tool-item">
                  <span className="mcp-tool-name">{tool.name}</span>
                  <span className="mcp-tool-desc">{tool.description}</span>
                </div>
              ))
            )}
          </div>

          <div className="mcp-detail-section">
            <h5><Settings2 size={12} /> Resources ({selected.resources.length})</h5>
            {selected.resources.length === 0 ? (
              <span className="mcp-no-items">No resources available</span>
            ) : (
              selected.resources.map((resource) => (
                <div key={resource.uri} className="mcp-resource-item">
                  <span className="mcp-resource-name">{resource.name}</span>
                  <span className="mcp-resource-uri">{resource.uri}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
