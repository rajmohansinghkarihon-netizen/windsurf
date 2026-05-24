import { useState, useEffect, useRef, useMemo } from 'react';
import { Command } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useEditorStore } from '../../store/editorStore';
import type { CommandItem } from '../../types';

export default function CommandPalette() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const setShowCommandPalette = useUIStore((s) => s.setShowCommandPalette);
  const setShowSettings = useUIStore((s) => s.setShowSettings);
  const setShowKeybindings = useUIStore((s) => s.setShowKeybindings);
  const setSidebarPanel = useUIStore((s) => s.setSidebarPanel);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleBottomPanel = useUIStore((s) => s.toggleBottomPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const setBottomPanel = useUIStore((s) => s.setBottomPanel);
  const setRightPanel = useUIStore((s) => s.setRightPanel);
  const setShowComposer = useUIStore((s) => s.setShowComposer);
  const setShowInlineEdit = useUIStore((s) => s.setShowInlineEdit);
  const toggleSplit = useEditorStore((s) => s.toggleSplit);

  const commands: CommandItem[] = useMemo(() => [
    { id: 'settings', label: 'Open Settings', category: 'General', keybinding: 'Ctrl+,', action: () => { setShowSettings(true); setShowCommandPalette(false); } },
    { id: 'keybindings', label: 'Keyboard Shortcuts', category: 'General', keybinding: 'Ctrl+K Ctrl+S', action: () => { setShowKeybindings(true); setShowCommandPalette(false); } },
    { id: 'toggleSidebar', label: 'Toggle Sidebar', category: 'View', keybinding: 'Ctrl+B', action: () => { toggleSidebar(); setShowCommandPalette(false); } },
    { id: 'toggleTerminal', label: 'Toggle Terminal', category: 'View', keybinding: 'Ctrl+`', action: () => { setBottomPanel('terminal'); toggleBottomPanel(); setShowCommandPalette(false); } },
    { id: 'toggleProblems', label: 'Toggle Problems', category: 'View', keybinding: 'Ctrl+Shift+M', action: () => { setBottomPanel('problems'); toggleBottomPanel(); setShowCommandPalette(false); } },
    { id: 'toggleAI', label: 'Toggle AI Panel', category: 'View', keybinding: 'Ctrl+Shift+A', action: () => { toggleRightPanel(); setShowCommandPalette(false); } },
    { id: 'explorer', label: 'Show Explorer', category: 'View', action: () => { setSidebarPanel('explorer'); setShowCommandPalette(false); } },
    { id: 'search', label: 'Search in Project', category: 'Search', keybinding: 'Ctrl+Shift+F', action: () => { setSidebarPanel('search'); setShowCommandPalette(false); } },
    { id: 'git', label: 'Show Git Panel', category: 'Git', keybinding: 'Ctrl+Shift+G', action: () => { setSidebarPanel('git'); setShowCommandPalette(false); } },
    { id: 'splitEditor', label: 'Split Editor', category: 'Editor', keybinding: 'Ctrl+\\', action: () => { toggleSplit(); setShowCommandPalette(false); } },
    { id: 'aiChat', label: 'Focus AI Chat', category: 'AI', keybinding: 'Ctrl+L', action: () => { setRightPanel('chat'); setShowCommandPalette(false); } },
    { id: 'composer', label: 'Open Composer', category: 'AI', keybinding: 'Ctrl+Shift+K', action: () => { setShowComposer(true); setShowCommandPalette(false); } },
    { id: 'inlineEdit', label: 'Inline Edit', category: 'AI', keybinding: 'Ctrl+K', action: () => { setShowInlineEdit(true); setShowCommandPalette(false); } },
    { id: 'usage', label: 'Usage Dashboard', category: 'AI', action: () => { setRightPanel('usage'); setShowCommandPalette(false); } },
    { id: 'notepads', label: 'Notepads', category: 'AI', action: () => { setRightPanel('notepads'); setShowCommandPalette(false); } },
    { id: 'extensions', label: 'Extensions', category: 'View', action: () => { setSidebarPanel('extensions'); setShowCommandPalette(false); } },
    { id: 'agentTasks', label: 'Agent Tasks', category: 'AI', action: () => { setSidebarPanel('agent'); setShowCommandPalette(false); } },
  ], [setShowSettings, setShowKeybindings, toggleSidebar, toggleBottomPanel, toggleRightPanel, setSidebarPanel, setBottomPanel, setRightPanel, setShowComposer, setShowInlineEdit, toggleSplit, setShowCommandPalette]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (c) => c.label.toLowerCase().includes(lower) || c.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowCommandPalette(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-input-row">
          <Command size={16} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="command-palette-input"
          />
        </div>
        <div className="command-palette-list">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`command-palette-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={cmd.action}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="command-label">{cmd.label}</span>
              <div className="command-right">
                <span className="command-category">{cmd.category}</span>
                {cmd.keybinding && <span className="command-keybinding">{cmd.keybinding}</span>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="command-palette-empty">No matching commands</div>
          )}
        </div>
      </div>
    </div>
  );
}
