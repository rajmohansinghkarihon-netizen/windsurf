import { Files, Search, GitBranch, Puzzle, Bot } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import type { SidebarPanel } from '../../store/uiStore';

const PANELS: { id: SidebarPanel; icon: typeof Files; label: string }[] = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'git', icon: GitBranch, label: 'Source Control' },
  { id: 'extensions', icon: Puzzle, label: 'Extensions' },
  { id: 'agent', icon: Bot, label: 'Agent Tasks' },
];

export default function ActivityBar() {
  const sidebarPanel = useUIStore((s) => s.sidebarPanel);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const setSidebarPanel = useUIStore((s) => s.setSidebarPanel);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const handleClick = (panel: SidebarPanel) => {
    if (showSidebar && sidebarPanel === panel) {
      toggleSidebar();
    } else {
      setSidebarPanel(panel);
    }
  };

  return (
    <div className="activity-bar">
      {PANELS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`activity-btn ${showSidebar && sidebarPanel === id ? 'active' : ''}`}
          onClick={() => handleClick(id)}
          title={label}
        >
          <Icon size={22} />
        </button>
      ))}
    </div>
  );
}
