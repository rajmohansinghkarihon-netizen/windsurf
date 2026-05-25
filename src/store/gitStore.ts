import { create } from 'zustand';
import type { GitStatus, GitCommit, GitBranch } from '../types';

interface GitState {
  status: GitStatus | null;
  branches: GitBranch[];
  commits: GitCommit[];
  showGitPanel: boolean;
  isLoading: boolean;
  commitMessage: string;
  selectedFiles: Set<string>;

  setStatus: (status: GitStatus | null) => void;
  setBranches: (branches: GitBranch[]) => void;
  setCommits: (commits: GitCommit[]) => void;
  setShowGitPanel: (show: boolean) => void;
  toggleGitPanel: () => void;
  setIsLoading: (loading: boolean) => void;
  setCommitMessage: (message: string) => void;
  toggleFileSelection: (path: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
}

export const useGitStore = create<GitState>((set, get) => ({
  status: null,
  branches: [],
  commits: [],
  showGitPanel: false,
  isLoading: false,
  commitMessage: '',
  selectedFiles: new Set<string>(),

  setStatus: (status) => set({ status }),
  setBranches: (branches) => set({ branches }),
  setCommits: (commits) => set({ commits }),
  setShowGitPanel: (show) => set({ showGitPanel: show }),
  toggleGitPanel: () => set((state) => ({ showGitPanel: !state.showGitPanel })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setCommitMessage: (message) => set({ commitMessage: message }),

  toggleFileSelection: (path) => {
    set((state) => {
      const next = new Set(state.selectedFiles);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { selectedFiles: next };
    });
  },

  selectAllFiles: () => {
    const status = get().status;
    if (!status) return;
    const all = new Set([
      ...status.staged.map((f) => f.path),
      ...status.unstaged.map((f) => f.path),
      ...status.untracked,
    ]);
    set({ selectedFiles: all });
  },

  clearSelection: () => set({ selectedFiles: new Set() }),
}));
