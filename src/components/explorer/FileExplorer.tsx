import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  RefreshCw,
  Trash2,
  Edit3,
} from 'lucide-react';
import { useFileStore } from '../../store/fileStore';
import { getFileIcon, getFileColor } from '../../utils/languages';
import type { FileEntry } from '../../types';

interface FileExplorerProps {
  onFileSelect: (path: string) => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string) => void;
  onRefresh: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
  isDir: boolean;
}

function FileTreeItem({
  entry,
  depth,
  onFileSelect,
  selectedPath,
  onContextMenu,
}: {
  entry: FileEntry;
  depth: number;
  onFileSelect: (path: string) => void;
  selectedPath: string;
  onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isSelected = selectedPath === entry.path;

  if (entry.is_dir) {
    return (
      <div>
        <div
          className={`file-tree-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: depth * 16 + 8 }}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(e) => onContextMenu(e, entry.path, true)}
        >
          <span className="tree-icon">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="tree-icon folder-icon">
            {expanded ? <FolderOpen size={16} color="#e8a87c" /> : <Folder size={16} color="#e8a87c" />}
          </span>
          <span className="tree-name">{entry.name}</span>
        </div>
        {expanded && entry.children && (
          <div>
            {entry.children.map((child) => (
              <FileTreeItem
                key={child.path}
                entry={child}
                depth={depth + 1}
                onFileSelect={onFileSelect}
                selectedPath={selectedPath}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const badge = getFileIcon(entry.name);
  const color = getFileColor(entry.name);

  return (
    <div
      className={`file-tree-item ${isSelected ? 'selected' : ''}`}
      style={{ paddingLeft: depth * 16 + 8 }}
      onClick={() => onFileSelect(entry.path)}
      onContextMenu={(e) => onContextMenu(e, entry.path, false)}
    >
      <span className="tree-icon" style={{ width: 14 }} />
      {badge ? (
        <span className="file-badge" style={{ color }}>{badge}</span>
      ) : (
        <span className="tree-icon">
          <File size={16} color="#8b949e" />
        </span>
      )}
      <span className="tree-name">{entry.name}</span>
    </div>
  );
}

export default function FileExplorer({
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  onRefresh,
}: FileExplorerProps) {
  const files = useFileStore((s) => s.files);
  const selectedPath = useFileStore((s) => s.selectedPath);
  const projectPath = useFileStore((s) => s.projectPath);
  const setSelectedPath = useFileStore((s) => s.setSelectedPath);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string, isDir: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleFileSelect = useCallback((path: string) => {
    setSelectedPath(path);
    onFileSelect(path);
  }, [onFileSelect, setSelectedPath]);

  return (
    <div className="file-explorer" onClick={closeContextMenu}>
      <div className="panel-header">
        <span>EXPLORER</span>
        <div className="panel-actions">
          <button className="icon-btn-sm" onClick={() => onCreateFile(projectPath)} title="New File">
            <Plus size={14} />
          </button>
          <button className="icon-btn-sm" onClick={() => onCreateFolder(projectPath)} title="New Folder">
            <FolderPlus size={14} />
          </button>
          <button className="icon-btn-sm" onClick={onRefresh} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="file-tree" role="tree">
        {files.map((entry) => (
          <FileTreeItem
            key={entry.path}
            entry={entry}
            depth={0}
            onFileSelect={handleFileSelect}
            selectedPath={selectedPath}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={closeContextMenu}
        >
          {contextMenu.isDir && (
            <>
              <button className="context-menu-item" onClick={() => onCreateFile(contextMenu.path)}>
                <Plus size={14} /> New File
              </button>
              <button className="context-menu-item" onClick={() => onCreateFolder(contextMenu.path)}>
                <FolderPlus size={14} /> New Folder
              </button>
              <div className="context-menu-separator" />
            </>
          )}
          <button className="context-menu-item" onClick={() => onRename(contextMenu.path)}>
            <Edit3 size={14} /> Rename
          </button>
          <button className="context-menu-item danger" onClick={() => onDelete(contextMenu.path)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
