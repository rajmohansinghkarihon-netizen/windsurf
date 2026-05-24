import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useEditorStore } from '../../store/editorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { streamCompletion } from '../../services/ai/streaming';
import { INLINE_EDIT_PROMPT } from '../../utils/prompts';

export default function InlineEdit() {
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const setShowInlineEdit = useUIStore((s) => s.setShowInlineEdit);
  const selectedText = useEditorStore((s) => s.selectedText);
  const config = useSettingsStore((s) => s.config);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);
  const tabs = useEditorStore((s) => s.tabs);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!instruction.trim() || isProcessing) return;
    setIsProcessing(true);
    setResult('');
    setShowDiff(false);

    const prompt = INLINE_EDIT_PROMPT
      .replace('{SELECTED_CODE}', selectedText)
      .replace('{INSTRUCTION}', instruction);

    const apiKey = config.providerKeys[config.provider] || config.api_key;

    try {
      await streamCompletion(
        {
          provider: config.provider,
          api_key: apiKey,
          model: config.model,
          system_prompt: 'You are a code editor. Return only the modified code.',
          user_prompt: prompt,
          temperature: 0.2,
          max_tokens: 4096,
        },
        {
          onToken: (token) => {
            setResult((prev) => prev + token);
          },
          onComplete: (fullText) => {
            setResult(fullText);
            setShowDiff(true);
            setIsProcessing(false);
          },
          onError: (error) => {
            setResult(`Error: ${error}`);
            setIsProcessing(false);
          },
        }
      );
    } catch (err) {
      setResult(`Error: ${err}`);
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!result || !activeTabId) return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    const newContent = tab.content.replace(selectedText, result);
    updateTabContent(activeTabId, newContent);
    setShowInlineEdit(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setShowInlineEdit(false);
    }
  };

  return (
    <div className="inline-edit-overlay">
      <div className="inline-edit-panel">
        <div className="inline-edit-header">
          <Sparkles size={14} />
          <span>Inline Edit (Ctrl+K)</span>
          <button className="icon-btn-sm" onClick={() => setShowInlineEdit(false)}>
            <X size={14} />
          </button>
        </div>

        <div className="inline-edit-input-row">
          <input
            ref={inputRef}
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the change... (e.g., 'add error handling')"
            className="inline-edit-input"
            disabled={isProcessing}
          />
          <button
            className="inline-edit-btn"
            onClick={handleSubmit}
            disabled={isProcessing || !instruction.trim()}
          >
            {isProcessing ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
          </button>
        </div>

        {selectedText && (
          <div className="inline-edit-selected">
            <span className="inline-edit-label">Selected:</span>
            <pre className="inline-edit-code">{selectedText.slice(0, 200)}{selectedText.length > 200 ? '...' : ''}</pre>
          </div>
        )}

        {result && (
          <div className="inline-edit-result">
            <span className="inline-edit-label">{showDiff ? 'Result:' : 'Generating...'}</span>
            <pre className="inline-edit-code result">{result}</pre>
            {showDiff && (
              <div className="inline-edit-actions">
                <button className="btn-primary small" onClick={handleApply}>
                  Apply Change
                </button>
                <button className="btn-secondary small" onClick={() => setShowInlineEdit(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
