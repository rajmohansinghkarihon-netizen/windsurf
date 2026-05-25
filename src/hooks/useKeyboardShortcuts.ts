import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useUIStore } from '../store/uiStore';
import { useEditorStore } from '../store/editorStore';


interface ShortcutHandler {
  command: string;
  handler: () => void;
}

function parseKeybinding(keys: string): { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; key: string } {
  const parts = keys.toLowerCase().split('+').map((p) => p.trim());
  return {
    ctrlKey: parts.includes('ctrl') || parts.includes('cmd'),
    shiftKey: parts.includes('shift'),
    altKey: parts.includes('alt'),
    key: parts.filter((p) => !['ctrl', 'cmd', 'shift', 'alt'].includes(p))[0] || '',
  };
}

function matchesKeybinding(
  event: KeyboardEvent,
  binding: { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; key: string }
): boolean {
  const eventKey = event.key.toLowerCase() === ' ' ? 'space' : event.key.toLowerCase();
  return (
    event.ctrlKey === binding.ctrlKey &&
    event.shiftKey === binding.shiftKey &&
    event.altKey === binding.altKey &&
    eventKey === binding.key
  );
}

export function useKeyboardShortcuts(additionalHandlers?: ShortcutHandler[]): void {
  const keybindings = useSettingsStore((s) => s.keybindings);

  useEffect(() => {
    const handlers: Record<string, () => void> = {
      'palette.open': () => useUIStore.getState().setShowCommandPalette(true),
      'file.quickOpen': () => useUIStore.getState().setShowQuickOpen(true),
      'sidebar.toggle': () => useUIStore.getState().toggleSidebar(),
      'terminal.toggle': () => {
        useUIStore.getState().toggleBottomPanel();
        useUIStore.getState().setBottomPanel('terminal');
      },
      'ai.toggle': () => useUIStore.getState().toggleRightPanel(),
      'ai.inlineEdit': () => useUIStore.getState().setShowInlineEdit(true),
      'ai.composer': () => useUIStore.getState().setShowComposer(true),
      'ai.focusChat': () => {
        useUIStore.getState().setRightPanel('chat');
        useUIStore.getState().setShowCommandPalette(false);
      },
      'search.open': () => useUIStore.getState().setSidebarPanel('search'),
      'editor.split': () => useEditorStore.getState().toggleSplit(),
      'git.toggle': () => useUIStore.getState().setSidebarPanel('git'),
      'problems.toggle': () => {
        useUIStore.getState().toggleBottomPanel();
        useUIStore.getState().setBottomPanel('problems');
      },
      'settings.open': () => useUIStore.getState().setShowSettings(true),
      'tab.close': () => {
        const { activeTabId, closeTab } = useEditorStore.getState();
        if (activeTabId) closeTab(activeTabId);
      },
    };

    if (additionalHandlers) {
      for (const h of additionalHandlers) {
        handlers[h.command] = h.handler;
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const kb of keybindings) {
        const binding = parseKeybinding(kb.keys);
        if (matchesKeybinding(e, binding)) {
          const handler = handlers[kb.command];
          if (handler) {
            e.preventDefault();
            e.stopPropagation();
            handler();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keybindings, additionalHandlers]);
}
