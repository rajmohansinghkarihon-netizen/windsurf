import {
  FolderOpen,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  TerminalSquare,
  Bot,
  Search,
  GitBranch,
  AlertTriangle,
  Columns2,
  Command,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useFileStore } from '../../store/fileStore';
import { useEditorStore } from '../../store/editorStore';
import { useGitStore } from '../../store/gitStore';

interface TitleBarProps {
  onOpenFolder: () => void;
}

export default function TitleBar({ onOpenFolder }: TitleBarProps) {
  const projectPath = useFileStore((s) => s.projectPath);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const showBottomPanel = useUIStore((s) => s.showBottomPanel);
  const toggleBottomPanel = useUIStore((s) => s.toggleBottomPanel);
  const showRightPanel = useUIStore((s) => s.showRightPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const setShowSettings = useUIStore((s) => s.setShowSettings);
  const setShowCommandPalette = useUIStore((s) => s.setShowCommandPalette);
  const setSidebarPanel = useUIStore((s) => s.setSidebarPanel);
  const setBottomPanel = useUIStore((s) => s.setBottomPanel);
  const toggleSplit = useEditorStore((s) => s.toggleSplit);
  const diagnosticCount = useEditorStore((s) => s.diagnostics.length);
  const gitBranch = useGitStore((s) => s.status?.branch);

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <button className="toolbar-btn" onClick={onOpenFolder} title="Open Folder (Ctrl+O)">
          <FolderOpen size={16} />
        </button>
        <button className="toolbar-btn" onClick={toggleSidebar} title="Toggle Sidebar (Ctrl+B)">
          {showSidebar ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
        <div className="titlebar-divider" />
        <button
          className="toolbar-btn"
          onClick={() => setSidebarPanel('search')}
          title="Search (Ctrl+Shift+F)"
        >
          <Search size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setSidebarPanel('git')}
          title="Git (Ctrl+Shift+G)"
        >
          <GitBranch size={16} />
          {gitBranch && <span className="toolbar-badge">{gitBranch}</span>}
        </button>
        <button
          className="toolbar-btn"
          onClick={toggleSplit}
          title="Split Editor (Ctrl+\\)"
        >
          <Columns2 size={16} />
        </button>
      </div>

      <div className="titlebar-center">
        <button
          className="command-bar"
          onClick={() => setShowCommandPalette(true)}
          title="Command Palette (Ctrl+Shift+P)"
        >
          <Command size={12} />
          <span>{projectPath ? projectPath.split('/').pop() : 'Zenith IDE'} — Command Palette</span>
        </button>
      </div>

      <div className="titlebar-right">
        {diagnosticCount > 0 && (
          <button
            className="toolbar-btn warning"
            onClick={() => {
              setBottomPanel('problems');
              if (!showBottomPanel) toggleBottomPanel();
            }}
            title={`${diagnosticCount} problems`}
          >
            <AlertTriangle size={14} />
            <span className="toolbar-count">{diagnosticCount}</span>
          </button>
        )}
        <button
          className={`toolbar-btn ${showBottomPanel ? 'active' : ''}`}
          onClick={toggleBottomPanel}
          title="Toggle Terminal (Ctrl+`)"
        >
          <TerminalSquare size={16} />
        </button>
        <button
          className={`toolbar-btn ${showRightPanel ? 'active' : ''}`}
          onClick={toggleRightPanel}
          title="Toggle AI Panel (Ctrl+Shift+A)"
        >
          <Bot size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setShowSettings(true)}
          title="Settings (Ctrl+,)"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
