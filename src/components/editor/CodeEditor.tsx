import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useUIStore } from '../../store/uiStore';

interface Props {
  content: string;
  language: string;
  path: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ content, language, onChange }: Props) {
  const config = useSettingsStore((s) => s.config);
  const setCursorPosition = useEditorStore((s) => s.setCursorPosition);
  const setSelectedText = useEditorStore((s) => s.setSelectedText);
  const setShowInlineEdit = useUIStore((s) => s.setShowInlineEdit);
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition(e.position.lineNumber, e.position.column);
    });

    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (model) {
        const selection = e.selection;
        if (!selection.isEmpty()) {
          const text = model.getValueInRange(selection);
          setSelectedText(text);
        } else {
          setSelectedText('');
        }
      }
    });

    editor.addCommand(
      2048 + 41, // KeyMod.CtrlCmd | KeyCode.KeyK
      () => {
        setShowInlineEdit(true);
      }
    );

    editor.focus();
  }, [setCursorPosition, setSelectedText, setShowInlineEdit]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      const model = editor.getModel();
      if (model && model.getValue() !== content) {
        // Only update if external change
      }
    }
  }, [content]);

  const monacoTheme = config.theme === 'light' ? 'vs' : 'vs-dark';

  return (
    <div className="code-editor">
      <Editor
        height="100%"
        language={language}
        value={content}
        theme={monacoTheme}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorMount}
        options={{
          fontSize: config.fontSize,
          fontFamily: config.fontFamily,
          minimap: { enabled: config.minimap, maxColumn: 80 },
          wordWrap: config.wordWrap ? 'on' : 'off',
          lineNumbers: config.lineNumbers ? 'on' : 'off',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          formatOnPaste: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 8 },
          tabSize: config.tabSize,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          parameterHints: { enabled: true },
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',
          matchBrackets: 'always',
          occurrencesHighlight: 'singleFile',
          renderLineHighlight: 'all',
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          stickyScroll: { enabled: true },
          inlineSuggest: { enabled: config.ghostText },
        }}
      />
    </div>
  );
}
