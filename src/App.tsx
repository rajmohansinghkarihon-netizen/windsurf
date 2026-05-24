import { useCallback, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ActivityBar from './components/layout/ActivityBar';
import TitleBar from './components/layout/TitleBar';
import StatusBar from './components/layout/StatusBar';
import FileExplorer from './components/explorer/FileExplorer';
import SearchPanel from './components/search/SearchPanel';
import GitPanel from './components/git/GitPanel';
import ExtensionsPanel from './components/common/ExtensionsPanel';
import AgentPanel from './components/agent/AgentPanel';
import EditorTabs from './components/editor/EditorTabs';
import CodeEditor from './components/editor/CodeEditor';
import InlineEdit from './components/editor/InlineEdit';
import AiChat from './components/chat/AiChat';
import ComposerPanel from './components/composer/ComposerPanel';
import NotepadsPanel from './components/notepads/NotepadsPanel';
import UsageDashboard from './components/usage/UsageDashboard';
import TerminalPanel from './components/terminal/TerminalPanel';
import ProblemsPanel from './components/common/ProblemsPanel';
import CommandPalette from './components/command-palette/CommandPalette';
import SettingsPanel from './components/settings/SettingsPanel';

import { useUIStore } from './store/uiStore';
import { useFileStore } from './store/fileStore';
import { useEditorStore } from './store/editorStore';
import { useSettingsStore } from './store/settingsStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSave } from './hooks/useAutoSave';

import { readDirectory, readFile, writeFile, createFile, createDirectory, deletePath, renamePath, setProjectRoot, loadConfigFromStore } from './services/tauri';
import { getLanguage } from './utils/languages';
import { generateId } from './utils/ids';
import type { ParsedResponse } from './types';

import './styles/globals.css';

const queryClient = new QueryClient();

function IDELayout() {
  const showSidebar = useUIStore((s) => s.showSidebar);
  const sidebarPanel = useUIStore((s) => s.sidebarPanel);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const showBottomPanel = useUIStore((s) => s.showBottomPanel);
  const bottomPanel = useUIStore((s) => s.bottomPanel);
  const bottomPanelHeight = useUIStore((s) => s.bottomPanelHeight);
  const showRightPanel = useUIStore((s) => s.showRightPanel);
  const rightPanel = useUIStore((s) => s.rightPanel);
  const rightPanelWidth = useUIStore((s) => s.rightPanelWidth);
  const showCommandPalette = useUIStore((s) => s.showCommandPalette);
  const showInlineEdit = useUIStore((s) => s.showInlineEdit);
  const showComposer = useUIStore((s) => s.showComposer);
  const showSettings = useUIStore((s) => s.showSettings);

  const projectPath = useFileStore((s) => s.projectPath);
  const setProjectPath = useFileStore((s) => s.setProjectPath);
  const setFiles = useFileStore((s) => s.setFiles);
  const addRecentProject = useFileStore((s) => s.addRecentProject);

  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const openTab = useEditorStore((s) => s.openTab);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);
  const markTabSaved = useEditorStore((s) => s.markTabSaved);

  const updateConfig = useSettingsStore((s) => s.updateConfig);

  useKeyboardShortcuts();
  useAutoSave();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Load settings on mount
  useEffect(() => {
    loadConfigFromStore().then((config) => {
      updateConfig(config);
    }).catch(() => {});
  }, [updateConfig]);

  const refreshFiles = useCallback(async (path: string) => {
    try {
      const entries = await readDirectory(path);
      setFiles(entries);
    } catch (err) {
      console.error('Failed to read directory:', err);
    }
  }, [setFiles]);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Open Project Folder',
      });
      if (selected && typeof selected === 'string') {
        setProjectPath(selected);
        addRecentProject(selected);
        await setProjectRoot(selected);
        await refreshFiles(selected);
      }
    } catch (err) {
      console.error('Open folder error:', err);
    }
  }, [setProjectPath, addRecentProject, refreshFiles]);

  const handleFileSelect = useCallback(async (path: string, _line?: number) => {
    try {
      const content = await readFile(path);
      const name = path.split('/').pop() || 'untitled';
      const language = getLanguage(name);

      openTab({
        id: generateId('tab'),
        path,
        name,
        content,
        originalContent: content,
        modified: false,
        language,
      });
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [openTab]);

  const handleSaveFile = useCallback(async () => {
    if (!activeTab) return;
    try {
      await writeFile(activeTab.path, activeTab.content);
      markTabSaved(activeTab.id);
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [activeTab, markTabSaved]);

  // Save on Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSaveFile]);

  const handleCreateFile = useCallback(async (parentPath: string) => {
    const name = window.prompt('Enter file name:');
    if (!name) return;
    const fullPath = `${parentPath}/${name}`;
    try {
      await createFile(fullPath);
      await refreshFiles(projectPath);
      await handleFileSelect(fullPath);
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  }, [projectPath, refreshFiles, handleFileSelect]);

  const handleCreateFolder = useCallback(async (parentPath: string) => {
    const name = window.prompt('Enter folder name:');
    if (!name) return;
    try {
      await createDirectory(`${parentPath}/${name}`);
      await refreshFiles(projectPath);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  }, [projectPath, refreshFiles]);

  const handleDelete = useCallback(async (path: string) => {
    if (!window.confirm(`Delete ${path.split('/').pop()}?`)) return;
    try {
      await deletePath(path);
      await refreshFiles(projectPath);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }, [projectPath, refreshFiles]);

  const handleRename = useCallback(async (path: string) => {
    const oldName = path.split('/').pop() || '';
    const newName = window.prompt('New name:', oldName);
    if (!newName || newName === oldName) return;
    const newPath = path.replace(new RegExp(`${oldName}$`), newName);
    try {
      await renamePath(path, newPath);
      await refreshFiles(projectPath);
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  }, [projectPath, refreshFiles]);

  const handleApplyChanges = useCallback(async (parsed: ParsedResponse) => {
    for (const fc of parsed.fileChanges) {
      const fullPath = `${projectPath}/${fc.path}`;
      try {
        if (fc.isNew) {
          await createFile(fullPath);
        }
        await writeFile(fullPath, fc.content);
      } catch (err) {
        console.error('Failed to apply change:', fc.path, err);
      }
    }

    for (const del of parsed.deletions) {
      try {
        await deletePath(`${projectPath}/${del}`);
      } catch (err) {
        console.error('Failed to delete:', del, err);
      }
    }

    await refreshFiles(projectPath);
  }, [projectPath, refreshFiles]);

  const renderSidebar = () => {
    switch (sidebarPanel) {
      case 'explorer':
        return (
          <FileExplorer
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDelete={handleDelete}
            onRename={handleRename}
            onRefresh={() => refreshFiles(projectPath)}
          />
        );
      case 'search':
        return <SearchPanel onFileSelect={handleFileSelect} />;
      case 'git':
        return <GitPanel />;
      case 'extensions':
        return <ExtensionsPanel />;
      case 'agent':
        return <AgentPanel />;
      default:
        return null;
    }
  };

  const renderRightPanel = () => {
    switch (rightPanel) {
      case 'chat':
        return <AiChat onApplyChanges={handleApplyChanges} />;
      case 'composer':
        return <NotepadsPanel />;
      case 'notepads':
        return <NotepadsPanel />;
      case 'usage':
        return <UsageDashboard />;
      default:
        return <AiChat onApplyChanges={handleApplyChanges} />;
    }
  };

  const renderBottomPanel = () => {
    switch (bottomPanel) {
      case 'terminal':
        return <TerminalPanel />;
      case 'problems':
        return <ProblemsPanel onFileSelect={handleFileSelect} />;
      case 'output':
        return <div className="output-panel"><pre>Output log...</pre></div>;
      default:
        return <TerminalPanel />;
    }
  };

  return (
    <div className="ide-layout" data-theme={useSettingsStore.getState().config.theme}>
      <TitleBar onOpenFolder={handleOpenFolder} />

      <div className="ide-body">
        <ActivityBar />

        {showSidebar && (
          <div className="sidebar" style={{ width: sidebarWidth }}>
            {renderSidebar()}
          </div>
        )}

        <div className="editor-area">
          <div className="editor-main" style={{
            height: showBottomPanel ? `calc(100% - ${bottomPanelHeight}px)` : '100%',
          }}>
            <EditorTabs />
            {activeTab ? (
              <CodeEditor
                content={activeTab.content}
                language={activeTab.language}
                path={activeTab.path}
                onChange={(val) => updateTabContent(activeTab.id, val)}
              />
            ) : (
              <div className="empty-editor">
                <div className="empty-editor-content">
                  <h2>Zenith IDE</h2>
                  <p>Open a folder to start (Ctrl+O)</p>
                  <p>Or use Ctrl+Shift+P for Command Palette</p>
                  <div className="empty-shortcuts">
                    <div><kbd>Ctrl+K</kbd> Inline Edit</div>
                    <div><kbd>Ctrl+L</kbd> AI Chat</div>
                    <div><kbd>Ctrl+Shift+K</kbd> Composer</div>
                    <div><kbd>Ctrl+`</kbd> Terminal</div>
                    <div><kbd>Ctrl+Shift+F</kbd> Search</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {showBottomPanel && (
            <div className="bottom-panel" style={{ height: bottomPanelHeight }}>
              <div className="bottom-panel-tabs">
                <button
                  className={`bottom-tab ${bottomPanel === 'terminal' ? 'active' : ''}`}
                  onClick={() => useUIStore.getState().setBottomPanel('terminal')}
                >
                  Terminal
                </button>
                <button
                  className={`bottom-tab ${bottomPanel === 'problems' ? 'active' : ''}`}
                  onClick={() => useUIStore.getState().setBottomPanel('problems')}
                >
                  Problems
                </button>
                <button
                  className={`bottom-tab ${bottomPanel === 'output' ? 'active' : ''}`}
                  onClick={() => useUIStore.getState().setBottomPanel('output')}
                >
                  Output
                </button>
              </div>
              {renderBottomPanel()}
            </div>
          )}
        </div>

        {showRightPanel && (
          <div className="right-panel" style={{ width: rightPanelWidth }}>
            <div className="right-panel-tabs">
              <button
                className={`right-tab ${rightPanel === 'chat' ? 'active' : ''}`}
                onClick={() => useUIStore.getState().setRightPanel('chat')}
              >
                Chat
              </button>
              <button
                className={`right-tab ${rightPanel === 'notepads' ? 'active' : ''}`}
                onClick={() => useUIStore.getState().setRightPanel('notepads')}
              >
                Notepads
              </button>
              <button
                className={`right-tab ${rightPanel === 'usage' ? 'active' : ''}`}
                onClick={() => useUIStore.getState().setRightPanel('usage')}
              >
                Usage
              </button>
            </div>
            {renderRightPanel()}
          </div>
        )}
      </div>

      <StatusBar />

      {showCommandPalette && <CommandPalette />}
      {showInlineEdit && <InlineEdit />}
      {showComposer && <ComposerPanel />}
      {showSettings && <SettingsPanel />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <IDELayout />
    </QueryClientProvider>
  );
}
