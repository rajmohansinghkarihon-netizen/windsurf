import { create } from 'zustand';
import type { SearchResult, SearchOptions } from '../types';

interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  options: SearchOptions;
  replaceText: string;
  showReplace: boolean;
  totalMatches: number;
  filesWithMatches: number;

  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  setIsSearching: (searching: boolean) => void;
  setOptions: (options: Partial<SearchOptions>) => void;
  setReplaceText: (text: string) => void;
  setShowReplace: (show: boolean) => void;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  isSearching: false,
  options: {
    query: '',
    regex: false,
    caseSensitive: false,
    wholeWord: false,
    maxResults: 1000,
  },
  replaceText: '',
  showReplace: false,
  totalMatches: 0,
  filesWithMatches: 0,

  setQuery: (query) => set((state) => ({
    query,
    options: { ...state.options, query },
  })),

  setResults: (results) => {
    const paths = new Set(results.map((r) => r.path));
    set({
      results,
      totalMatches: results.length,
      filesWithMatches: paths.size,
    });
  },

  setIsSearching: (searching) => set({ isSearching: searching }),

  setOptions: (options) => set((state) => ({
    options: { ...state.options, ...options },
  })),

  setReplaceText: (text) => set({ replaceText: text }),
  setShowReplace: (show) => set({ showReplace: show }),

  clearResults: () => set({
    results: [],
    totalMatches: 0,
    filesWithMatches: 0,
  }),
}));
