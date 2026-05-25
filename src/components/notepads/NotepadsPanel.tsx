import { Plus, Pin, Trash2 } from 'lucide-react';
import { useAIStore } from '../../store/aiStore';
import { generateId } from '../../utils/ids';
import type { Notepad } from '../../types';

export default function NotepadsPanel() {
  const notepads = useAIStore((s) => s.notepads);
  const activeNotepadId = useAIStore((s) => s.activeNotepadId);
  const setActiveNotepadId = useAIStore((s) => s.setActiveNotepadId);
  const addNotepad = useAIStore((s) => s.addNotepad);
  const updateNotepad = useAIStore((s) => s.updateNotepad);
  const deleteNotepad = useAIStore((s) => s.deleteNotepad);

  const activeNotepad = notepads.find((n) => n.id === activeNotepadId);

  const handleNew = () => {
    const notepad: Notepad = {
      id: generateId('notepad'),
      title: `Note ${notepads.length + 1}`,
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    addNotepad(notepad);
    setActiveNotepadId(notepad.id);
  };

  const sorted = [...notepads].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <div className="notepads-panel">
      <div className="panel-header">
        <span>NOTEPADS</span>
        <div className="panel-actions">
          <button className="icon-btn-sm" onClick={handleNew} title="New Notepad">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {!activeNotepad ? (
        <div className="notepads-list">
          {sorted.map((n) => (
            <div
              key={n.id}
              className="notepad-item"
              onClick={() => setActiveNotepadId(n.id)}
            >
              <div className="notepad-item-header">
                {n.pinned && <Pin size={12} />}
                <span className="notepad-title">{n.title}</span>
              </div>
              <span className="notepad-preview">{n.content.slice(0, 50) || 'Empty note'}</span>
              <span className="notepad-date">{new Date(n.updatedAt).toLocaleDateString()}</span>
            </div>
          ))}
          {notepads.length === 0 && (
            <div className="notepads-empty">
              <p>No notepads yet</p>
              <button className="btn-secondary small" onClick={handleNew}>Create one</button>
            </div>
          )}
        </div>
      ) : (
        <div className="notepad-editor">
          <div className="notepad-editor-header">
            <button className="icon-btn-sm" onClick={() => setActiveNotepadId('')}>
              Back
            </button>
            <input
              className="notepad-title-input"
              value={activeNotepad.title}
              onChange={(e) => updateNotepad(activeNotepad.id, { title: e.target.value, updatedAt: Date.now() })}
            />
            <div className="notepad-editor-actions">
              <button
                className={`icon-btn-sm ${activeNotepad.pinned ? 'active' : ''}`}
                onClick={() => updateNotepad(activeNotepad.id, { pinned: !activeNotepad.pinned })}
                title={activeNotepad.pinned ? 'Unpin' : 'Pin'}
              >
                <Pin size={14} />
              </button>
              <button
                className="icon-btn-sm danger"
                onClick={() => {
                  deleteNotepad(activeNotepad.id);
                  setActiveNotepadId('');
                }}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <textarea
            className="notepad-content"
            value={activeNotepad.content}
            onChange={(e) => updateNotepad(activeNotepad.id, { content: e.target.value, updatedAt: Date.now() })}
            placeholder="Write notes here... You can reference these in chat with @notepad"
          />
        </div>
      )}
    </div>
  );
}
