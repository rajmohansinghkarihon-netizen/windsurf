import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Loader2, Check, XCircle, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAIStore } from '../../store/aiStore';
import { useFileStore } from '../../store/fileStore';
import { useSettingsStore } from '../../store/settingsStore';

import { streamCompletion } from '../../services/ai/streaming';
import { buildAIContext } from '../../services/ai/context';
import { SYSTEM_PROMPT, parseResponse, generateDiff } from '../../utils/prompts';
import { generateId } from '../../utils/ids';
import { writeFile } from '../../services/tauri';
import type { ComposerSession, ComposerFile } from '../../types';

export default function ComposerPanel() {
  const [instruction, setInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const setShowComposer = useUIStore((s) => s.setShowComposer);
  const composerSession = useAIStore((s) => s.composerSession);
  const setComposerSession = useAIStore((s) => s.setComposerSession);
  const addComposerHistory = useAIStore((s) => s.addComposerHistory);
  const files = useFileStore((s) => s.files);
  const projectPath = useFileStore((s) => s.projectPath);
  const config = useSettingsStore((s) => s.config);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const toggleFileExpanded = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!instruction.trim() || isGenerating) return;
    setIsGenerating(true);

    const apiKey = config.providerKeys[config.provider] || config.api_key;

    try {
      const prompt = await buildAIContext({
        userPrompt: `Create or modify multiple files to implement the following:\n\n${instruction}\n\nRespond with FILE blocks for ALL files that need to be created or modified.`,
        files,
        mentions: [],
        projectPath,
        customInstructions: config.projectRules,
      });

      let accumulatedText = '';

      await streamCompletion(
        {
          provider: config.provider,
          api_key: apiKey,
          model: config.model,
          system_prompt: SYSTEM_PROMPT,
          user_prompt: prompt,
          temperature: 0.3,
          max_tokens: 16384,
        },
        {
          onToken: (token) => { accumulatedText += token; },
          onComplete: (_text) => {
            const finalText = accumulatedText;
            const existingFiles = new Set<string>();
            const collectPaths = (entries: typeof files, prefix = '') => {
              for (const e of entries) {
                const p = prefix ? `${prefix}/${e.name}` : e.name;
                if (e.is_dir && e.children) collectPaths(e.children, p);
                else existingFiles.add(p);
              }
            };
            collectPaths(files);

            const parsed = parseResponse(finalText, existingFiles);
            const composerFiles: ComposerFile[] = parsed.fileChanges.map((fc) => ({
              path: fc.path,
              originalContent: fc.isNew ? '' : '[loading...]',
              newContent: fc.content,
              diff: {
                path: fc.path,
                oldContent: fc.isNew ? '' : '[loading...]',
                newContent: fc.content,
                hunks: [],
                isNew: fc.isNew,
                isDeleted: false,
              },
              accepted: false,
            }));

            const session: ComposerSession = {
              id: generateId('composer'),
              instruction,
              status: 'reviewing',
              files: composerFiles,
              createdAt: Date.now(),
            };

            setComposerSession(session);
            setIsGenerating(false);
          },
          onError: (error) => {
            console.error('Composer error:', error);
            setIsGenerating(false);
          },
        }
      );
    } catch (err) {
      console.error('Composer failed:', err);
      setIsGenerating(false);
    }
  };

  const handleAcceptFile = (path: string) => {
    if (!composerSession) return;
    setComposerSession({
      ...composerSession,
      files: composerSession.files.map((f) =>
        f.path === path ? { ...f, accepted: true } : f
      ),
    });
  };

  const handleRejectFile = (path: string) => {
    if (!composerSession) return;
    setComposerSession({
      ...composerSession,
      files: composerSession.files.filter((f) => f.path !== path),
    });
  };

  const handleApplyAll = async () => {
    if (!composerSession) return;
    const accepted = composerSession.files.filter((f) => f.accepted);

    for (const file of accepted) {
      try {
        const fullPath = `${projectPath}/${file.path}`;
        await writeFile(fullPath, file.newContent);
      } catch (err) {
        console.error('Failed to apply:', file.path, err);
      }
    }

    setComposerSession({ ...composerSession, status: 'applied' });
    addComposerHistory(composerSession);
  };

  const handleAcceptAll = () => {
    if (!composerSession) return;
    setComposerSession({
      ...composerSession,
      files: composerSession.files.map((f) => ({ ...f, accepted: true })),
    });
  };

  return (
    <div className="composer-overlay" onClick={() => setShowComposer(false)}>
      <div className="composer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="composer-header">
          <Sparkles size={16} />
          <span>Composer — Multi-file Editor</span>
          <button className="icon-btn-sm" onClick={() => setShowComposer(false)}>
            <X size={16} />
          </button>
        </div>

        {!composerSession && (
          <div className="composer-input-area">
            <textarea
              ref={inputRef}
              className="composer-input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Describe the feature or change you want to make across multiple files..."
              rows={4}
              disabled={isGenerating}
            />
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={isGenerating || !instruction.trim()}
            >
              {isGenerating ? (
                <><Loader2 size={14} className="spin" /> Generating...</>
              ) : (
                <><Sparkles size={14} /> Generate Changes</>
              )}
            </button>
          </div>
        )}

        {composerSession && composerSession.status === 'reviewing' && (
          <div className="composer-review">
            <div className="composer-review-header">
              <span>{composerSession.files.length} files to review</span>
              <div className="composer-review-actions">
                <button className="btn-secondary small" onClick={handleAcceptAll}>
                  <Check size={12} /> Accept All
                </button>
                <button className="btn-primary small" onClick={handleApplyAll}>
                  Apply Accepted
                </button>
              </div>
            </div>

            {composerSession.files.map((file) => (
              <div key={file.path} className="composer-file">
                <div className="composer-file-header" onClick={() => toggleFileExpanded(file.path)}>
                  {expandedFiles.has(file.path) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <FileText size={14} />
                  <span className={`composer-file-path ${file.diff.isNew ? 'new' : 'modified'}`}>
                    {file.diff.isNew ? '[NEW] ' : '[MOD] '}{file.path}
                  </span>
                  <div className="composer-file-actions">
                    {!file.accepted ? (
                      <>
                        <button className="icon-btn-sm success" onClick={(e) => { e.stopPropagation(); handleAcceptFile(file.path); }}>
                          <Check size={12} />
                        </button>
                        <button className="icon-btn-sm danger" onClick={(e) => { e.stopPropagation(); handleRejectFile(file.path); }}>
                          <XCircle size={12} />
                        </button>
                      </>
                    ) : (
                      <span className="composer-accepted"><Check size={12} /> Accepted</span>
                    )}
                  </div>
                </div>

                {expandedFiles.has(file.path) && (
                  <div className="composer-file-diff">
                    <pre className="composer-diff-content">
                      {generateDiff(file.originalContent, file.newContent)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {composerSession?.status === 'applied' && (
          <div className="composer-applied">
            <Check size={24} />
            <p>Changes applied successfully!</p>
            <button className="btn-secondary" onClick={() => {
              setComposerSession(null);
              setInstruction('');
            }}>
              New Composition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
