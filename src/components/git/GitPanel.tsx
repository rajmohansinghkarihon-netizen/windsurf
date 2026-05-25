import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  GitCommit as GitCommitIcon,
  Plus,
  Minus,
  RefreshCw,
  Check,
  Upload,
  Download,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useGitStore } from '../../store/gitStore';
import { useFileStore } from '../../store/fileStore';
import { useSettingsStore } from '../../store/settingsStore';
import { gitStatus, gitStage, gitUnstage, gitCommit, gitPush, gitPull, gitDiff, gitLog, gitBranches } from '../../services/tauri';
import { callLlm } from '../../services/tauri';
import { COMMIT_MESSAGE_PROMPT } from '../../utils/prompts';

export default function GitPanel() {
  const status = useGitStore((s) => s.status);
  const setStatus = useGitStore((s) => s.setStatus);
  const commits = useGitStore((s) => s.commits);
  const setCommits = useGitStore((s) => s.setCommits);
  const branches = useGitStore((s) => s.branches);
  const setBranches = useGitStore((s) => s.setBranches);
  const commitMessage = useGitStore((s) => s.commitMessage);
  const setCommitMessage = useGitStore((s) => s.setCommitMessage);
  const isLoading = useGitStore((s) => s.isLoading);
  const setIsLoading = useGitStore((s) => s.setIsLoading);
  const projectPath = useFileStore((s) => s.projectPath);
  const config = useSettingsStore((s) => s.config);
  const [activeView, setActiveView] = useState<'changes' | 'commits' | 'branches'>('changes');
  const [generatingMsg, setGeneratingMsg] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!projectPath) return;
    setIsLoading(true);
    try {
      const s = await gitStatus(projectPath);
      setStatus(s);
    } catch (err) {
      console.error('Git status failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, setStatus, setIsLoading]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleStage = async (files: string[]) => {
    try {
      await gitStage(projectPath, files);
      await refreshStatus();
    } catch (err) {
      console.error('Stage failed:', err);
    }
  };

  const handleUnstage = async (files: string[]) => {
    try {
      await gitUnstage(projectPath, files);
      await refreshStatus();
    } catch (err) {
      console.error('Unstage failed:', err);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    try {
      setIsLoading(true);
      const stagedFiles = status?.staged.map((f) => f.path) || [];
      await gitCommit(projectPath, commitMessage, stagedFiles);
      setCommitMessage('');
      await refreshStatus();
    } catch (err) {
      console.error('Commit failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    try {
      setIsLoading(true);
      await gitPush(projectPath);
      await refreshStatus();
    } catch (err) {
      console.error('Push failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    try {
      setIsLoading(true);
      await gitPull(projectPath);
      await refreshStatus();
    } catch (err) {
      console.error('Pull failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCommitMessage = async () => {
    setGeneratingMsg(true);
    try {
      const diff = await gitDiff(projectPath, true);
      const apiKey = config.providerKeys[config.provider] || config.api_key;
      const prompt = COMMIT_MESSAGE_PROMPT.replace('{DIFF}', diff.slice(0, 4000));

      const response = await callLlm({
        provider: config.provider,
        api_key: apiKey,
        model: config.model,
        system_prompt: 'Generate a conventional commit message.',
        user_prompt: prompt,
      });

      if (response.success) {
        setCommitMessage(response.text.trim().replace(/^```\n?|```$/g, ''));
      }
    } catch (err) {
      console.error('Failed to generate commit message:', err);
    } finally {
      setGeneratingMsg(false);
    }
  };

  const loadCommits = async () => {
    try {
      const logs = await gitLog(projectPath, 50);
      setCommits(logs);
    } catch (err) {
      console.error('Failed to load git log:', err);
    }
  };

  const loadBranches = async () => {
    try {
      const b = await gitBranches(projectPath);
      setBranches(b);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  useEffect(() => {
    if (activeView === 'commits') loadCommits();
    if (activeView === 'branches') loadBranches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const statusIndicator = (s: string) => {
    const colors: Record<string, string> = {
      added: 'var(--green)',
      modified: 'var(--yellow)',
      deleted: 'var(--red)',
      renamed: 'var(--blue)',
    };
    return <span className="git-status-dot" style={{ background: colors[s] || 'var(--text-muted)' }} />;
  };

  return (
    <div className="git-panel">
      <div className="panel-header">
        <span>SOURCE CONTROL</span>
        <div className="panel-actions">
          <button className="icon-btn-sm" onClick={refreshStatus} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="git-tabs">
        <button className={`git-tab ${activeView === 'changes' ? 'active' : ''}`} onClick={() => setActiveView('changes')}>
          Changes
        </button>
        <button className={`git-tab ${activeView === 'commits' ? 'active' : ''}`} onClick={() => setActiveView('commits')}>
          Commits
        </button>
        <button className={`git-tab ${activeView === 'branches' ? 'active' : ''}`} onClick={() => setActiveView('branches')}>
          Branches
        </button>
      </div>

      {activeView === 'changes' && (
        <div className="git-changes">
          <div className="git-commit-area">
            <div className="git-commit-input-row">
              <textarea
                className="git-commit-input"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                rows={3}
              />
              <button
                className="icon-btn-sm ai-btn"
                onClick={handleGenerateCommitMessage}
                disabled={generatingMsg}
                title="Generate commit message with AI"
              >
                {generatingMsg ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              </button>
            </div>
            <div className="git-commit-actions">
              <button className="btn-primary small" onClick={handleCommit} disabled={isLoading || !commitMessage.trim()}>
                <Check size={14} /> Commit
              </button>
              <button className="icon-btn-sm" onClick={handlePush} title="Push">
                <Upload size={14} />
              </button>
              <button className="icon-btn-sm" onClick={handlePull} title="Pull">
                <Download size={14} />
              </button>
            </div>
          </div>

          {status && (
            <>
              {status.staged.length > 0 && (
                <div className="git-section">
                  <div className="git-section-header">
                    <span>Staged Changes ({status.staged.length})</span>
                    <button className="icon-btn-sm" onClick={() => handleUnstage(status.staged.map((f) => f.path))} title="Unstage all">
                      <Minus size={14} />
                    </button>
                  </div>
                  {status.staged.map((file) => (
                    <div key={file.path} className="git-file-item">
                      {statusIndicator(file.status)}
                      <span className="git-file-path">{file.path}</span>
                      <button className="icon-btn-sm" onClick={() => handleUnstage([file.path])} title="Unstage">
                        <Minus size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(status.unstaged.length > 0 || status.untracked.length > 0) && (
                <div className="git-section">
                  <div className="git-section-header">
                    <span>Changes ({status.unstaged.length + status.untracked.length})</span>
                    <button
                      className="icon-btn-sm"
                      onClick={() => handleStage([...status.unstaged.map((f) => f.path), ...status.untracked])}
                      title="Stage all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {status.unstaged.map((file) => (
                    <div key={file.path} className="git-file-item">
                      {statusIndicator(file.status)}
                      <span className="git-file-path">{file.path}</span>
                      <button className="icon-btn-sm" onClick={() => handleStage([file.path])} title="Stage">
                        <Plus size={12} />
                      </button>
                    </div>
                  ))}
                  {status.untracked.map((path) => (
                    <div key={path} className="git-file-item">
                      {statusIndicator('added')}
                      <span className="git-file-path">{path}</span>
                      <button className="icon-btn-sm" onClick={() => handleStage([path])} title="Stage">
                        <Plus size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeView === 'commits' && (
        <div className="git-commits">
          {commits.map((commit) => (
            <div key={commit.hash} className="git-commit-item">
              <GitCommitIcon size={14} className="git-commit-icon" />
              <div className="git-commit-info">
                <span className="git-commit-msg">{commit.message}</span>
                <span className="git-commit-meta">
                  {commit.shortHash} by {commit.author} - {commit.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'branches' && (
        <div className="git-branches">
          {branches.map((branch) => (
            <div key={branch.name} className={`git-branch-item ${branch.current ? 'current' : ''}`}>
              <GitBranch size={14} />
              <span className="git-branch-name">{branch.name}</span>
              {branch.current && <Check size={12} className="git-current-badge" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
