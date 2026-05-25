import { useState } from 'react';
import {
  FileText, Terminal, Search, GitBranch, CheckCircle, XCircle,
  Clock, ChevronDown, ChevronRight, Play, AlertTriangle, Shield,
} from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import type { AgentStep } from '../../types';

function getStepIcon(type: AgentStep['type']) {
  switch (type) {
    case 'read_file': case 'write_file': case 'create_file': case 'delete_file':
      return <FileText size={14} />;
    case 'run_command': case 'terminal':
      return <Terminal size={14} />;
    case 'search': case 'search_project':
      return <Search size={14} />;
    case 'git':
      return <GitBranch size={14} />;
    case 'test': case 'test_runner':
      return <Play size={14} />;
    case 'lsp': case 'lsp_diagnostics':
      return <AlertTriangle size={14} />;
    case 'verify':
      return <Shield size={14} />;
    default:
      return <Clock size={14} />;
  }
}

function getStatusIcon(status: AgentStep['status']) {
  switch (status) {
    case 'completed': return <CheckCircle size={14} className="text-green" />;
    case 'failed': return <XCircle size={14} className="text-red" />;
    case 'running': return <Clock size={14} className="text-blue spin" />;
    case 'skipped': return <AlertTriangle size={14} className="text-yellow" />;
    default: return <Clock size={14} className="text-muted" />;
  }
}

function formatDuration(start?: number, end?: number): string {
  if (!start) return '';
  const elapsed = (end || Date.now()) - start;
  if (elapsed < 1000) return `${elapsed}ms`;
  if (elapsed < 60000) return `${(elapsed / 1000).toFixed(1)}s`;
  return `${Math.floor(elapsed / 60000)}m ${Math.floor((elapsed % 60000) / 1000)}s`;
}

export default function AgentExecutionLog() {
  const tasks = useAgentStore((s) => s.tasks);
  const activeTaskId = useAgentStore((s) => s.activeTaskId);
  const agentLogs = useAgentStore((s) => s.agentLogs);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showRawLogs, setShowRawLogs] = useState(false);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  if (!activeTask) {
    return (
      <div className="agent-execution-log empty">
        <p>No active agent task. Start a task to see the execution log.</p>
      </div>
    );
  }

  return (
    <div className="agent-execution-log">
      <div className="execution-log-header">
        <h4>{activeTask.title}</h4>
        <span className={`task-status-badge ${activeTask.status}`}>{activeTask.status}</span>
        <button
          className="btn-secondary small"
          onClick={() => setShowRawLogs(!showRawLogs)}
        >
          {showRawLogs ? 'Timeline' : 'Raw Logs'}
        </button>
      </div>

      {showRawLogs ? (
        <div className="raw-logs">
          {agentLogs.map((log, i) => (
            <div key={i} className="raw-log-entry">{log}</div>
          ))}
        </div>
      ) : (
        <div className="execution-timeline">
          {activeTask.steps.map((step, index) => (
            <div key={step.id} className={`timeline-entry ${step.status}`}>
              <div className="timeline-connector">
                <div className="timeline-dot">{getStatusIcon(step.status)}</div>
                {index < activeTask.steps.length - 1 && <div className="timeline-line" />}
              </div>

              <div className="timeline-content" onClick={() => toggleStep(step.id)}>
                <div className="timeline-header">
                  <span className="step-icon">{getStepIcon(step.type)}</span>
                  <span className="step-description">{step.description}</span>
                  <span className="step-type-badge">{step.type}</span>
                  {step.timestamp && (
                    <span className="step-duration">{formatDuration(step.timestamp)}</span>
                  )}
                  {step.requiresApproval && <Shield size={12} className="approval-icon" />}
                  {expandedSteps.has(step.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>

                {expandedSteps.has(step.id) && (
                  <div className="step-details">
                    {step.input && (
                      <div className="step-input">
                        <strong>Input:</strong>
                        <pre>{JSON.stringify(step.input, null, 2)}</pre>
                      </div>
                    )}
                    {step.output && (
                      <div className="step-output">
                        <strong>Output:</strong>
                        <pre>{step.output.slice(0, 2000)}{step.output.length > 2000 ? '...' : ''}</pre>
                      </div>
                    )}
                    {step.error && (
                      <div className="step-error">
                        <strong>Error:</strong>
                        <pre>{step.error}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
