import { generateDiff } from '../../utils/prompts';

interface Props {
  oldContent: string;
  newContent: string;
  fileName: string;
}

export default function DiffViewer({ oldContent, newContent, fileName }: Props) {
  const diff = generateDiff(oldContent, newContent);
  const lines = diff.split('\n');

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <span className="diff-filename">{fileName}</span>
      </div>
      <div className="diff-content">
        {lines.map((line, i) => {
          let cls = 'diff-line context';
          if (line.startsWith('+')) cls = 'diff-line added';
          else if (line.startsWith('-')) cls = 'diff-line removed';

          return (
            <div key={i} className={cls}>
              <span className="diff-gutter">{i + 1}</span>
              <span className="diff-indicator">
                {line.startsWith('+') ? '+' : line.startsWith('-') ? '-' : ' '}
              </span>
              <pre className="diff-text">{line.slice(2)}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
