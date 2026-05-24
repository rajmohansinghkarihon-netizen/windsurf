import { useState } from 'react';
import {
  Bot, Plus, Play, Pause, Check, X, Loader2,
  ChevronRight, ChevronDown, Shield, AlertTriangle,
} from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { useFileStore } from '../../store/fileStore';
import { useSettingsStore } from '../../store/settingsStore';
import { AgentRuntime } from '../../services/agent/runtime';
import { generateId } from '../../utils/ids';
import type { AgentTask } from '../../types';

export default function AgentPanel() {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const tasks = useAgentStore((s) => s.tasks);
  const activeTaskId = useAgentStore((s) => s.activeTaskId);
  const addTask = useAgentStore((s) => s.addTask);
  const approvalQueue = useAgentStore((s) => s.approvalQueue);
  const resolveApproval = useAgentStore((s) => s.resolveApproval);
  const agentLogs = useAgentStore((s) => s.agentLogs);
  const projectPath = useFileStore((s) => s.projectPath);
  const config = useSettingsStore((s) => s.config);

  const toggleExpanded = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    const task: AgentTask = {
      id: generateId('task'),
      title: newTaskTitle,
      description: newTaskDesc,
      status: 'pending',
      steps: [],
      currentStep: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalFiles: 0,
      totalCommands: 0,
    };

    addTask(task);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setShowNewTask(false);

    const apiKey = config.providerKeys[config.provider] || config.api_key;
    const runtime = new AgentRuntime(projectPath, apiKey, config.provider, config.model);
    runtime.executeTask(task);
  };

  const statusColor = (status: AgentTask['status']) => {
    const colors: Record<string, string> = {
      pending: 'var(--text-muted)',
      planning: 'var(--blue)',
      executing: 'var(--yellow)',
      verifying: 'var(--blue)',
      completed: 'var(--green)',
      failed: 'var(--red)',
      paused: 'var(--orange)',
      awaiting_approval: 'var(--yellow)',
    };
    return colors[status] || 'var(--text-muted)';
  };

  const statusIcon = (status: AgentTask['status']) => {
    switch (status) {
      case 'planning':
      case 'executing':
      case 'verifying':
        return <Loader2 size={14} className="spin" />;
      case 'completed':
        return <Check size={14} />;
      case 'failed':
        return <X size={14} />;
      case 'paused':
        return <Pause size={14} />;
      case 'awaiting_approval':
        return <Shield size={14} />;
      default:
        return <Bot size={14} />;
    }
  };

  return (
    <div className="agent-panel">
      <div className="panel-header">
        <Bot size={16} />
        <span>AGENT TASKS</span>
        <div className="panel-actions">
          <button className="icon-btn-sm" onClick={() => setShowNewTask(!showNewTask)} title="New Task">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {approvalQueue.length > 0 && (
        <div className="approval-queue">
          <h4 className="approval-title">
            <Shield size={14} /> Approval Required ({approvalQueue.length})
          </h4>
          {approvalQueue.map((req) => (
            <div key={req.id} className="approval-item">
              <div className="approval-info">
                <span className="approval-type">{req.type}</span>
                <span className="approval-desc">{req.description}</span>
                {req.command && <code className="approval-command">{req.command}</code>}
                {req.details && <pre className="approval-details">{req.details.slice(0, 200)}</pre>}
              </div>
              <div className="approval-actions">
                <button className="btn-primary small" onClick={() => resolveApproval(req.id, true)}>
                  <Check size={12} /> Approve
                </button>
                <button className="btn-secondary small danger" onClick={() => resolveApproval(req.id, false)}>
                  <X size={12} /> Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewTask && (
        <div className="new-task-form">
          <input
            className="task-title-input"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title (e.g., 'Add user authentication')"
          />
          <textarea
            className="task-desc-input"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            placeholder="Detailed description..."
            rows={3}
          />
          <div className="new-task-actions">
            <button className="btn-primary small" onClick={handleCreateTask} disabled={!newTaskTitle.trim()}>
              <Play size={12} /> Start Task
            </button>
            <button className="btn-secondary small" onClick={() => setShowNewTask(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="task-list">
        {tasks.map((task) => (
          <div key={task.id} className={`task-item ${activeTaskId === task.id ? 'active' : ''}`}>
            <div className="task-header" onClick={() => toggleExpanded(task.id)}>
              {expandedTasks.has(task.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span style={{ color: statusColor(task.status) }}>{statusIcon(task.status)}</span>
              <span className="task-title">{task.title}</span>
              <span className="task-status-badge" style={{ color: statusColor(task.status) }}>
                {task.status}
              </span>
            </div>

            {expandedTasks.has(task.id) && (
              <div className="task-details">
                {task.description && <p className="task-description">{task.description}</p>}
                <div className="task-steps">
                  {task.steps.map((step, i) => (
                    <div key={step.id} className={`task-step ${step.status}`}>
                      <span className="step-number">{i + 1}</span>
                      <span className="step-desc">{step.description}</span>
                      <span className="step-status">{step.status}</span>
                    </div>
                  ))}
                </div>
                {task.error && (
                  <div className="task-error">
                    <AlertTriangle size={12} /> {task.error}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="task-empty">
            <Bot size={24} />
            <p>No agent tasks</p>
            <p className="task-empty-hint">Create a task to have the AI agent work autonomously</p>
          </div>
        )}
      </div>

      {agentLogs.length > 0 && (
        <div className="agent-logs">
          <h4>Agent Logs</h4>
          <div className="agent-log-list">
            {agentLogs.slice(-10).map((log, i) => (
              <div key={i} className="agent-log-entry">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
