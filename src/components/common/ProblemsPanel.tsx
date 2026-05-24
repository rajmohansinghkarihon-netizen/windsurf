import { AlertTriangle, Info, AlertCircle, Lightbulb } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import type { Diagnostic } from '../../types';

interface ProblemsPanelProps {
  onFileSelect: (path: string, line?: number) => void;
}

export default function ProblemsPanel({ onFileSelect }: ProblemsPanelProps) {
  const diagnostics = useEditorStore((s) => s.diagnostics);

  const grouped = diagnostics.reduce<Record<string, Diagnostic[]>>((acc, d) => {
    if (!acc[d.path]) acc[d.path] = [];
    acc[d.path].push(d);
    return acc;
  }, {});

  const severityIcon = (severity: Diagnostic['severity']) => {
    switch (severity) {
      case 'error': return <AlertCircle size={14} className="severity-error" />;
      case 'warning': return <AlertTriangle size={14} className="severity-warning" />;
      case 'info': return <Info size={14} className="severity-info" />;
      case 'hint': return <Lightbulb size={14} className="severity-hint" />;
    }
  };

  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;

  return (
    <div className="problems-panel">
      <div className="problems-header">
        <span>PROBLEMS</span>
        <div className="problems-summary">
          {errors > 0 && <span className="severity-error"><AlertCircle size={12} /> {errors}</span>}
          {warnings > 0 && <span className="severity-warning"><AlertTriangle size={12} /> {warnings}</span>}
        </div>
      </div>

      <div className="problems-list">
        {Object.entries(grouped).map(([path, items]) => (
          <div key={path} className="problems-group">
            <div className="problems-file" onClick={() => onFileSelect(path)}>
              {path.split('/').pop()} — {items.length} problem{items.length !== 1 ? 's' : ''}
            </div>
            {items.map((d, i) => (
              <div
                key={i}
                className="problems-item"
                onClick={() => onFileSelect(d.path, d.line)}
              >
                {severityIcon(d.severity)}
                <span className="problems-message">{d.message}</span>
                <span className="problems-location">
                  [{d.line},{d.column}]
                </span>
                {d.source && <span className="problems-source">{d.source}</span>}
              </div>
            ))}
          </div>
        ))}

        {diagnostics.length === 0 && (
          <div className="problems-empty">No problems detected</div>
        )}
      </div>
    </div>
  );
}
