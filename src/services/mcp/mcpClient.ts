export interface MCPServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'http' | 'websocket';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverId: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId: string;
}

export interface MCPPromptTemplate {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  serverId: string;
}

export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPromptTemplate[];
  error?: string;
  lastConnected?: number;
}

export class MCPClient {
  private servers: Map<string, MCPServerState> = new Map();
  private onStateChange?: (servers: MCPServerState[]) => void;

  setStateChangeCallback(callback: (servers: MCPServerState[]) => void): void {
    this.onStateChange = callback;
  }

  async registerServer(config: MCPServerConfig): Promise<void> {
    this.servers.set(config.id, {
      config,
      status: 'disconnected',
      tools: [],
      resources: [],
      prompts: [],
    });
    this.notifyStateChange();

    if (config.enabled) {
      await this.connectServer(config.id);
    }
  }

  async connectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`Server not found: ${serverId}`);

    server.status = 'connecting';
    this.notifyStateChange();

    try {
      server.tools = await this.discoverTools(server.config);
      server.resources = await this.discoverResources(server.config);
      server.prompts = await this.discoverPrompts(server.config);
      server.status = 'connected';
      server.lastConnected = Date.now();
      server.error = undefined;
    } catch (err) {
      server.status = 'error';
      server.error = err instanceof Error ? err.message : String(err);
    }

    this.notifyStateChange();
  }

  async disconnectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    server.status = 'disconnected';
    server.tools = [];
    server.resources = [];
    server.prompts = [];
    this.notifyStateChange();
  }

  async removeServer(serverId: string): Promise<void> {
    await this.disconnectServer(serverId);
    this.servers.delete(serverId);
    this.notifyStateChange();
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<string> {
    const server = this.servers.get(serverId);
    if (!server || server.status !== 'connected') {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const tool = server.tools.find((t) => t.name === toolName);
    if (!tool) throw new Error(`Tool not found: ${toolName}`);

    if (server.config.transport === 'http' && server.config.url) {
      const response = await fetch(`${server.config.url}/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arguments: args }),
      });
      const result = await response.json();
      return JSON.stringify(result);
    }

    return JSON.stringify({ result: 'Tool executed', tool: toolName, args });
  }

  async readResource(serverId: string, uri: string): Promise<string> {
    const server = this.servers.get(serverId);
    if (!server || server.status !== 'connected') {
      throw new Error(`Server ${serverId} is not connected`);
    }

    if (server.config.transport === 'http' && server.config.url) {
      const response = await fetch(`${server.config.url}/resources?uri=${encodeURIComponent(uri)}`);
      return await response.text();
    }

    return `Resource content for: ${uri}`;
  }

  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        tools.push(...server.tools);
      }
    }
    return tools;
  }

  getAllResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        resources.push(...server.resources);
      }
    }
    return resources;
  }

  getServers(): MCPServerState[] {
    return Array.from(this.servers.values());
  }

  private async discoverTools(config: MCPServerConfig): Promise<MCPTool[]> {
    if (config.transport === 'http' && config.url) {
      try {
        const response = await fetch(`${config.url}/tools`);
        const data = await response.json();
        return (data.tools || []).map((t: Record<string, unknown>) => ({
          ...t,
          serverId: config.id,
        }));
      } catch {
        return [];
      }
    }
    return [];
  }

  private async discoverResources(config: MCPServerConfig): Promise<MCPResource[]> {
    if (config.transport === 'http' && config.url) {
      try {
        const response = await fetch(`${config.url}/resources`);
        const data = await response.json();
        return (data.resources || []).map((r: Record<string, unknown>) => ({
          ...r,
          serverId: config.id,
        }));
      } catch {
        return [];
      }
    }
    return [];
  }

  private async discoverPrompts(config: MCPServerConfig): Promise<MCPPromptTemplate[]> {
    if (config.transport === 'http' && config.url) {
      try {
        const response = await fetch(`${config.url}/prompts`);
        const data = await response.json();
        return (data.prompts || []).map((p: Record<string, unknown>) => ({
          ...p,
          serverId: config.id,
        }));
      } catch {
        return [];
      }
    }
    return [];
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.getServers());
  }
}

export const mcpClient = new MCPClient();
