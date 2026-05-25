import React, { useState } from 'react';
import { Server, Wifi, WifiOff, Plus, Trash2, RefreshCw } from 'lucide-react';

interface RemoteServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: number;
}

export const RemoteServerPanel: React.FC = () => {
  const [servers, setServers] = useState<RemoteServer[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'key' as 'password' | 'key',
  });

  const addServer = () => {
    if (!formData.name || !formData.host) return;
    const server: RemoteServer = {
      id: `srv-${Date.now()}`,
      ...formData,
      status: 'disconnected',
    };
    setServers((prev) => [...prev, server]);
    setFormData({ name: '', host: '', port: 22, username: '', authType: 'key' });
    setShowAddForm(false);
  };

  const connectServer = (id: string) => {
    setServers((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: 'connecting' as const } : s)
    );

    setTimeout(() => {
      setServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: 'connected' as const, lastConnected: Date.now() }
            : s
        )
      );
    }, 2000);
  };

  const disconnectServer = (id: string) => {
    setServers((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: 'disconnected' as const } : s)
    );
  };

  const removeServer = (id: string) => {
    setServers((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="remote-server-panel">
      <div className="remote-header">
        <h4><Server size={14} /> Remote Servers</h4>
        <button onClick={() => setShowAddForm(true)} title="Add Server">
          <Plus size={14} />
        </button>
      </div>

      {showAddForm && (
        <div className="remote-add-form">
          <input
            placeholder="Server name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            placeholder="Host (e.g., 192.168.1.100)"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
          />
          <div className="remote-form-row">
            <input
              type="number"
              placeholder="Port"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
              style={{ width: '80px' }}
            />
            <input
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <select
            value={formData.authType}
            onChange={(e) => setFormData({ ...formData, authType: e.target.value as 'password' | 'key' })}
          >
            <option value="key">SSH Key</option>
            <option value="password">Password</option>
          </select>
          <div className="remote-form-actions">
            <button onClick={addServer}>Add</button>
            <button onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="remote-server-list">
        {servers.length === 0 && !showAddForm ? (
          <div className="remote-empty">
            <Server size={20} />
            <p>No remote servers configured</p>
            <span>Connect to remote servers for development</span>
          </div>
        ) : (
          servers.map((server) => (
            <div key={server.id} className="remote-server-item">
              <div className="remote-server-info">
                {server.status === 'connected' ? (
                  <Wifi size={14} className="connected" />
                ) : (
                  <WifiOff size={14} className="disconnected" />
                )}
                <div>
                  <div className="remote-server-name">{server.name}</div>
                  <div className="remote-server-host">
                    {server.username}@{server.host}:{server.port}
                  </div>
                  <div className={`remote-server-status ${server.status}`}>
                    {server.status}
                  </div>
                </div>
              </div>
              <div className="remote-server-actions">
                {server.status === 'connected' ? (
                  <button onClick={() => disconnectServer(server.id)} title="Disconnect">
                    <WifiOff size={12} />
                  </button>
                ) : (
                  <button
                    onClick={() => connectServer(server.id)}
                    disabled={server.status === 'connecting'}
                    title="Connect"
                  >
                    {server.status === 'connecting' ? (
                      <RefreshCw size={12} className="spinning" />
                    ) : (
                      <Wifi size={12} />
                    )}
                  </button>
                )}
                <button onClick={() => removeServer(server.id)} title="Remove">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
