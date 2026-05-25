import { useState, useRef, useEffect } from 'react';
import { Plus, X, TerminalSquare } from 'lucide-react';
import { useTerminalStore } from '../../store/terminalStore';
import { useFileStore } from '../../store/fileStore';
import { runTerminalCommand } from '../../services/tauri';
import { generateId } from '../../utils/ids';

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

export default function TerminalPanel() {
  const sessions = useTerminalStore((s) => s.sessions);
  const activeSessionId = useTerminalStore((s) => s.activeSessionId);
  const addSession = useTerminalStore((s) => s.addSession);
  const removeSession = useTerminalStore((s) => s.removeSession);
  const setActiveSession = useTerminalStore((s) => s.setActiveSession);
  const projectPath = useFileStore((s) => s.projectPath);

  const [lines, setLines] = useState<Record<string, TerminalLine[]>>({});
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNewSession = () => {
    const id = generateId('term');
    const name = `Terminal ${sessions.length + 1}`;
    addSession({ id, name, cwd: projectPath, active: true });
    setLines((prev) => ({
      ...prev,
      [id]: [
        { type: 'output', text: `Zenith Terminal - ${projectPath}` },
        { type: 'output', text: 'Type commands and press Enter. Type "clear" to clear.' },
      ],
    }));
  };

  useEffect(() => {
    if (sessions.length === 0) {
      handleNewSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, activeSessionId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [running, activeSessionId]);

  const handleSubmit = async () => {
    const cmd = input.trim();
    if (!cmd || !activeSessionId) return;

    if (cmd === 'clear') {
      setLines((prev) => ({ ...prev, [activeSessionId]: [] }));
      setInput('');
      return;
    }

    setLines((prev) => ({
      ...prev,
      [activeSessionId]: [...(prev[activeSessionId] || []), { type: 'input', text: `$ ${cmd}` }],
    }));
    setHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);
    setInput('');
    setRunning(true);

    try {
      const result = await runTerminalCommand(cmd, projectPath);
      const newLines: TerminalLine[] = [];
      if (result.stdout) newLines.push({ type: 'output', text: result.stdout });
      if (result.stderr) newLines.push({ type: 'error', text: result.stderr });
      if (result.exit_code !== 0) {
        newLines.push({ type: 'error', text: `Process exited with code ${result.exit_code}` });
      }
      setLines((prev) => ({
        ...prev,
        [activeSessionId]: [...(prev[activeSessionId] || []), ...newLines],
      }));
    } catch (err) {
      setLines((prev) => ({
        ...prev,
        [activeSessionId]: [...(prev[activeSessionId] || []), { type: 'error', text: `Error: ${err}` }],
      }));
    } finally {
      setRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = historyIdx < history.length - 1 ? historyIdx + 1 : historyIdx;
        setHistoryIdx(newIdx);
        setInput(history[history.length - 1 - newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setInput(history[history.length - 1 - newIdx]);
      } else {
        setHistoryIdx(-1);
        setInput('');
      }
    }
  };

  const currentLines = lines[activeSessionId] || [];

  return (
    <div className="terminal-panel">
      <div className="terminal-tabs-bar">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`terminal-tab ${activeSessionId === s.id ? 'active' : ''}`}
            onClick={() => setActiveSession(s.id)}
          >
            <TerminalSquare size={12} />
            <span>{s.name}</span>
            <button
              className="terminal-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                removeSession(s.id);
              }}
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button className="terminal-tab-add" onClick={handleNewSession} title="New Terminal">
          <Plus size={14} />
        </button>
      </div>

      <div className="terminal-output" onClick={() => inputRef.current?.focus()}>
        {currentLines.map((line, i) => (
          <div key={i} className={`terminal-line ${line.type}`}>
            <pre>{line.text}</pre>
          </div>
        ))}
        <div className="terminal-input-line">
          <span className="terminal-prompt">$</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            placeholder={running ? 'Running...' : 'Type a command...'}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
