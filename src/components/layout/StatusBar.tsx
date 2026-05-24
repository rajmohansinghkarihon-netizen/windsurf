import { useEditorStore } from '../../store/editorStore';

import { useGitStore } from '../../store/gitStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAIStore } from '../../store/aiStore';
import { GitBranch, AlertTriangle, Info, Cpu } from 'lucide-react';

export default function StatusBar() {
  const cursorPosition = useEditorStore((s) => s.cursorPosition);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const diagnostics = useEditorStore((s) => s.diagnostics);
  const gitStatus = useGitStore((s) => s.status);
  const config = useSettingsStore((s) => s.config);
  const isStreaming = useAIStore((s) => s.isStreaming);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        {gitStatus && (
          <div className="status-item">
            <GitBranch size={12} />
            <span>{gitStatus.branch}</span>
            {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
              <span className="git-sync">
                {gitStatus.ahead > 0 && `↑${gitStatus.ahead}`}
                {gitStatus.behind > 0 && `↓${gitStatus.behind}`}
              </span>
            )}
          </div>
        )}
        {(errors > 0 || warnings > 0) && (
          <div className="status-item">
            {errors > 0 && (
              <span className="status-error">
                <AlertTriangle size={12} /> {errors}
              </span>
            )}
            {warnings > 0 && (
              <span className="status-warning">
                <Info size={12} /> {warnings}
              </span>
            )}
          </div>
        )}
        {isStreaming && (
          <div className="status-item streaming">
            <Cpu size={12} />
            <span>AI generating...</span>
          </div>
        )}
      </div>

      <div className="status-bar-right">
        {activeTab && (
          <>
            <div className="status-item">
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </div>
            <div className="status-item">{activeTab.language}</div>
            <div className="status-item">UTF-8</div>
            <div className="status-item">
              {config.tabSize === 2 ? 'Spaces: 2' : `Spaces: ${config.tabSize}`}
            </div>
          </>
        )}
        <div className="status-item">
          {config.provider} / {config.model}
        </div>
      </div>
    </div>
  );
}
