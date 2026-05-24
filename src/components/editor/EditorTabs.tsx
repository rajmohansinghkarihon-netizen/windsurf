import { X, Circle } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getFileIcon, getFileColor } from '../../utils/languages';

export default function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);

  if (tabs.length === 0) return null;

  return (
    <div className="editor-tabs">
      {tabs.map((tab) => {
        const icon = getFileIcon(tab.name);
        const color = getFileColor(tab.name);
        const isActive = activeTabId === tab.id;

        return (
          <div
            key={tab.id}
            className={`editor-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.path}
          >
            {icon && (
              <span className="file-badge" style={{ color }}>
                {icon}
              </span>
            )}
            <span className="tab-name">
              {tab.modified && <Circle size={8} fill="currentColor" className="tab-modified-dot" />}
              {tab.name}
            </span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              title="Close (Ctrl+W)"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
