import { useState } from 'react';
import { X, Check, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { FileChange } from '../../types';

interface Props {
  changes: FileChange[];
  onApprove: (approvedChanges: FileChange[]) => void;
  onReject: () => void;
}

export default function DiffPreviewModal({ changes, onApprove, onReject }: Props) {
  const [checkedFiles, setCheckedFiles] = useState<Set<number>>(
    () => new Set(changes.map((_, i) => i))
  );
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(
    () => new Set(changes.map((_, i) => i))
  );

  const toggleCheck = (index: number) => {
    setCheckedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => setCheckedFiles(new Set(changes.map((_, i) => i)));
  const deselectAll = () => setCheckedFiles(new Set());

  const handleApprove = () => {
    const approved = changes.filter((_, i) => checkedFiles.has(i));
    onApprove(approved);
  };

  const renderDiffLines = (content: string) => {
    return content.split('\n').map((line, i) => {
      let className = 'diff-line context';
      if (line.startsWith('+')) className = 'diff-line added';
      else if (line.startsWith('-')) className = 'diff-line removed';
      else if (line.startsWith('@@')) className = 'diff-line hunk-header';

      return (
        <div key={i} className={className}>
          <span className="diff-line-number">{i + 1}</span>
          <span className="diff-line-content">{line}</span>
        </div>
      );
    });
  };

  return (
    <div className="diff-preview-overlay">
      <div className="diff-preview-modal">
        <div className="diff-preview-header">
          <h3>Review Changes ({checkedFiles.size}/{changes.length} files selected)</h3>
          <button className="icon-btn-sm" onClick={onReject}><X size={16} /></button>
        </div>

        <div className="diff-preview-toolbar">
          <button className="btn-secondary small" onClick={selectAll}>Select All</button>
          <button className="btn-secondary small" onClick={deselectAll}>Deselect All</button>
        </div>

        <div className="diff-preview-files">
          {changes.map((change, index) => (
            <div key={index} className="diff-preview-file">
              <div className="diff-file-header" onClick={() => toggleExpand(index)}>
                <label className="diff-checkbox" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={checkedFiles.has(index)}
                    onChange={() => toggleCheck(index)}
                  />
                </label>
                {expandedFiles.has(index) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className={`diff-file-badge ${change.isNew ? 'new' : 'modified'}`}>
                  {change.isNew ? 'NEW' : 'MOD'}
                </span>
                <span className="diff-file-path">{change.path}</span>
              </div>

              {expandedFiles.has(index) && (
                <div className="diff-file-content">
                  <pre className="diff-code">{renderDiffLines(change.content)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="diff-preview-actions">
          <button
            className="btn-primary"
            onClick={handleApprove}
            disabled={checkedFiles.size === 0}
          >
            <Check size={14} /> Apply {checkedFiles.size} file(s)
          </button>
          <button className="btn-secondary" onClick={onReject}>
            <XCircle size={14} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
