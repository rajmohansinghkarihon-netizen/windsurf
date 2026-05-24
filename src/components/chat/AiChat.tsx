import { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Loader2, Check, Copy, Sparkles, X,
  File, Folder, Globe, BookOpen, GitBranch, Terminal, Code2,
  AlertTriangle, Trash2, StopCircle,
} from 'lucide-react';
import { useAIStore } from '../../store/aiStore';
import { useFileStore } from '../../store/fileStore';
import { useEditorStore } from '../../store/editorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { streamCompletion } from '../../services/ai/streaming';
import { buildAIContext, parseMentions } from '../../services/ai/context';
import { SYSTEM_PROMPT, parseResponse } from '../../utils/prompts';
import { estimateCost } from '../../services/ai/providers';
import { generateId } from '../../utils/ids';
import type { ChatMessage, MentionContext, ParsedResponse, AIProvider } from '../../types';

interface AiChatProps {
  onApplyChanges: (parsed: ParsedResponse) => Promise<void>;
}

const MENTION_TYPES: { type: MentionContext['type']; icon: typeof File; label: string }[] = [
  { type: '@file', icon: File, label: 'File' },
  { type: '@folder', icon: Folder, label: 'Folder' },
  { type: '@codebase', icon: Code2, label: 'Codebase' },
  { type: '@web', icon: Globe, label: 'Web Search' },
  { type: '@docs', icon: BookOpen, label: 'Documentation' },
  { type: '@git', icon: GitBranch, label: 'Git Context' },
  { type: '@terminal', icon: Terminal, label: 'Terminal Output' },
  { type: '@problems', icon: AlertTriangle, label: 'Problems' },
];

export default function AiChat({ onApplyChanges }: AiChatProps) {
  const [input, setInput] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const messages = useAIStore((s) => s.messages);
  const addMessage = useAIStore((s) => s.addMessage);
  const updateMessage = useAIStore((s) => s.updateMessage);
  const clearMessages = useAIStore((s) => s.clearMessages);
  const isStreaming = useAIStore((s) => s.isStreaming);
  const setStreaming = useAIStore((s) => s.setStreaming);
  const streamingContent = useAIStore((s) => s.streamingContent);
  const setStreamingContent = useAIStore((s) => s.setStreamingContent);
  const appendStreamingContent = useAIStore((s) => s.appendStreamingContent);
  const currentMentions = useAIStore((s) => s.currentMentions);
  const setCurrentMentions = useAIStore((s) => s.setCurrentMentions);
  const addMention = useAIStore((s) => s.addMention);
  const addUsageRecord = useAIStore((s) => s.addUsageRecord);
  const addToPromptHistory = useAIStore((s) => s.addToPromptHistory);

  const files = useFileStore((s) => s.files);
  const projectPath = useFileStore((s) => s.projectPath);

  const config = useSettingsStore((s) => s.config);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const selectedText = useEditorStore((s) => s.selectedText);
  const diagnostics = useEditorStore((s) => s.diagnostics);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (type: MentionContext['type']) => {
    addMention({ type, value: '' });
    setShowMentions(false);
    const atIdx = input.lastIndexOf('@');
    if (atIdx >= 0) {
      setInput(input.slice(0, atIdx) + `${type} `);
    }
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const apiKey = config.providerKeys[config.provider] || config.api_key;
    if (!apiKey && config.provider !== 'ollama') {
      addMessage({
        id: generateId('msg'),
        role: 'assistant',
        content: 'Please set your API key in Settings first.',
        timestamp: Date.now(),
      });
      return;
    }

    const { cleanText, mentions: parsedMentions } = parseMentions(text);
    const allMentions = [...currentMentions, ...parsedMentions];

    const userMsg: ChatMessage = {
      id: generateId('msg'),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      mentions: allMentions.length > 0 ? allMentions : undefined,
    };
    addMessage(userMsg);
    addToPromptHistory(text);
    setInput('');
    setCurrentMentions([]);
    setShowMentions(false);

    setStreaming(true);
    setStreamingContent('');

    const activeTab = tabs.find((t) => t.id === activeTabId);
    const diagnosticStr = diagnostics.length > 0
      ? diagnostics.map((d) => `${d.path}:${d.line}: [${d.severity}] ${d.message}`).join('\n')
      : undefined;

    try {
      const fullPrompt = await buildAIContext({
        userPrompt: cleanText,
        files,
        mentions: allMentions,
        currentFile: activeTab ? { path: activeTab.path, content: activeTab.content } : undefined,
        selectedText: selectedText || undefined,
        diagnostics: diagnosticStr,
        projectPath,
        customInstructions: config.projectRules || undefined,
        conversationHistory: messages.slice(-10),
      });

      const assistantMsgId = generateId('msg');
      addMessage({
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        streaming: true,
      });

      abortRef.current = new AbortController();

      await streamCompletion(
        {
          provider: config.provider,
          api_key: apiKey,
          model: config.model,
          system_prompt: SYSTEM_PROMPT,
          user_prompt: fullPrompt,
          temperature: 0.3,
          max_tokens: 8192,
        },
        {
          onToken: (token) => {
            appendStreamingContent(token);
          },
          onComplete: (fullText, usage) => {
            const existingFiles = new Set<string>();
            const collectPaths = (entries: typeof files, prefix = '') => {
              for (const e of entries) {
                const p = prefix ? `${prefix}/${e.name}` : e.name;
                if (e.is_dir && e.children) collectPaths(e.children, p);
                else existingFiles.add(p);
              }
            };
            collectPaths(files);

            const parsed = parseResponse(fullText, existingFiles);
            const hasActions = parsed.fileChanges.length > 0 || parsed.deletions.length > 0 || parsed.commands.length > 0;

            updateMessage(assistantMsgId, {
              content: fullText,
              parsed: hasActions ? parsed : undefined,
              applied: false,
              streaming: false,
              usage: usage || undefined,
            });

            if (usage) {
              const cost = estimateCost(
                config.provider as AIProvider,
                config.model,
                usage.prompt_tokens,
                usage.completion_tokens
              );
              addUsageRecord({
                id: generateId('usage'),
                provider: config.provider,
                model: config.model,
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
                estimatedCost: cost,
                timestamp: Date.now(),
                type: 'chat',
              });
            }

            setStreaming(false);
            setStreamingContent('');
          },
          onError: (error) => {
            updateMessage(assistantMsgId, {
              content: `Error: ${error}`,
              streaming: false,
            });
            setStreaming(false);
            setStreamingContent('');
          },
        },
        abortRef.current.signal
      );
    } catch (err) {
      setStreaming(false);
      setStreamingContent('');
      addMessage({
        id: generateId('msg'),
        role: 'assistant',
        content: `Error: ${err}`,
        timestamp: Date.now(),
      });
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleApply = (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg?.parsed) return;

    const doApply = async () => {
      try {
        await onApplyChanges(msg.parsed!);
        updateMessage(msgId, { applied: true });
      } catch (err) {
        const ts = performance.now();
        addMessage({
          id: generateId('msg'),
          role: 'assistant',
          content: `Failed to apply: ${err}`,
          timestamp: ts,
        });
      }
    };
    void doApply();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-chat">
      <div className="panel-header">
        <Bot size={16} />
        <span>ZENITH AI</span>
        <div className="panel-actions">
          <button className="icon-btn-sm" onClick={clearMessages} title="Clear chat">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <Sparkles size={32} />
            <p><strong>Zenith AI</strong></p>
            <p className="chat-welcome-hint">
              Your AI coding assistant. Use @-mentions to add context.
            </p>
            <div className="chat-suggestions">
              <button className="chat-suggestion" onClick={() => setInput('Explain this codebase')}>
                Explain codebase
              </button>
              <button className="chat-suggestion" onClick={() => setInput('Find and fix bugs')}>
                Fix bugs
              </button>
              <button className="chat-suggestion" onClick={() => setInput('Generate tests for @file')}>
                Generate tests
              </button>
              <button className="chat-suggestion" onClick={() => setInput('Refactor @selection')}>
                Refactor code
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="chat-message-icon">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="chat-message-content">
              {msg.role === 'user' ? (
                <div className="chat-user-msg">
                  {msg.mentions && msg.mentions.length > 0 && (
                    <div className="chat-mentions">
                      {msg.mentions.map((m, i) => (
                        <span key={i} className="mention-tag">{m.type}{m.value ? `(${m.value})` : ''}</span>
                      ))}
                    </div>
                  )}
                  <p>{msg.content}</p>
                </div>
              ) : (
                <>
                  {msg.streaming ? (
                    <div className="chat-streaming">
                      <pre className="chat-text">{streamingContent || '...'}</pre>
                      <div className="streaming-indicator">
                        <Loader2 size={14} className="spin" /> Generating...
                      </div>
                    </div>
                  ) : (
                    <>
                      {msg.parsed?.explanation && <p className="chat-explanation">{msg.parsed.explanation}</p>}

                      {msg.parsed && (
                        <div className="chat-changes">
                          {msg.parsed.fileChanges.map((fc, j) => (
                            <div key={j} className="change-item file-change">
                              {fc.isNew ? '+ NEW: ' : '~ EDIT: '}{fc.path}
                            </div>
                          ))}
                          {msg.parsed.deletions.map((d, j) => (
                            <div key={j} className="change-item deletion">
                              x DEL: {d}
                            </div>
                          ))}
                          {msg.parsed.commands.map((c, j) => (
                            <div key={j} className="change-item command">
                              $ {c}
                            </div>
                          ))}

                          {!msg.applied ? (
                            <button className="apply-btn" onClick={() => handleApply(msg.id)}>
                              <Check size={14} /> Apply Changes
                            </button>
                          ) : (
                            <div className="applied-badge">
                              <Check size={14} /> Applied
                            </div>
                          )}
                        </div>
                      )}

                      {!msg.parsed && (
                        <div className="chat-text-wrapper">
                          <pre className="chat-text">{msg.content}</pre>
                          <button className="copy-btn" onClick={() => handleCopy(msg.content)} title="Copy">
                            <Copy size={12} />
                          </button>
                        </div>
                      )}

                      {msg.usage && (
                        <div className="chat-usage">
                          {msg.usage.total_tokens} tokens
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {showMentions && (
        <div className="mention-popup">
          {MENTION_TYPES.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              className="mention-item"
              onClick={() => handleMentionSelect(type)}
            >
              <Icon size={14} />
              <span>{type}</span>
              <span className="mention-desc">{label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-area">
        {currentMentions.length > 0 && (
          <div className="chat-active-mentions">
            {currentMentions.map((m, i) => (
              <span key={i} className="mention-tag">
                {m.type}
                <button onClick={() => {
                  const next = currentMentions.filter((_, idx) => idx !== i);
                  setCurrentMentions(next);
                }}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Zenith... (@ for context, Enter to send)"
            rows={2}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button className="chat-send-btn stop" onClick={handleStop} title="Stop generating">
              <StopCircle size={18} />
            </button>
          ) : (
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send (Enter)"
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
