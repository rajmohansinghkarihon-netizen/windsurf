import { useCallback } from 'react';
import { Search, X, CaseSensitive, Regex, WholeWord, Replace, Loader2 } from 'lucide-react';
import { useSearchStore } from '../../store/searchStore';
import { useFileStore } from '../../store/fileStore';
import { searchProject } from '../../services/tauri';

interface SearchPanelProps {
  onFileSelect: (path: string, line?: number) => void;
}

export default function SearchPanel({ onFileSelect }: SearchPanelProps) {
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const results = useSearchStore((s) => s.results);
  const setResults = useSearchStore((s) => s.setResults);
  const isSearching = useSearchStore((s) => s.isSearching);
  const setIsSearching = useSearchStore((s) => s.setIsSearching);
  const options = useSearchStore((s) => s.options);
  const setOptions = useSearchStore((s) => s.setOptions);
  const totalMatches = useSearchStore((s) => s.totalMatches);
  const filesWithMatches = useSearchStore((s) => s.filesWithMatches);
  const replaceText = useSearchStore((s) => s.replaceText);
  const setReplaceText = useSearchStore((s) => s.setReplaceText);
  const showReplace = useSearchStore((s) => s.showReplace);
  const setShowReplace = useSearchStore((s) => s.setShowReplace);
  const projectPath = useFileStore((s) => s.projectPath);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !projectPath) return;
    setIsSearching(true);

    try {
      const searchResults = await searchProject(projectPath, query, {
        regex: options.regex,
        caseSensitive: options.caseSensitive,
        wholeWord: options.wholeWord,
        maxResults: 1000,
      });
      setResults(searchResults);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, projectPath, options, setIsSearching, setResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const groupedResults = results.reduce<Record<string, typeof results>>((acc, r) => {
    if (!acc[r.path]) acc[r.path] = [];
    acc[r.path].push(r);
    return acc;
  }, {});

  return (
    <div className="search-panel">
      <div className="panel-header">
        <span>SEARCH</span>
      </div>

      <div className="search-input-area">
        <div className="search-input-row">
          <div className="search-input-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="search-input"
            />
            {query && (
              <button className="icon-btn-sm" onClick={() => setQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <div className="search-toggles">
            <button
              className={`search-toggle ${options.caseSensitive ? 'active' : ''}`}
              onClick={() => setOptions({ caseSensitive: !options.caseSensitive })}
              title="Match Case"
            >
              <CaseSensitive size={14} />
            </button>
            <button
              className={`search-toggle ${options.wholeWord ? 'active' : ''}`}
              onClick={() => setOptions({ wholeWord: !options.wholeWord })}
              title="Match Whole Word"
            >
              <WholeWord size={14} />
            </button>
            <button
              className={`search-toggle ${options.regex ? 'active' : ''}`}
              onClick={() => setOptions({ regex: !options.regex })}
              title="Use Regular Expression"
            >
              <Regex size={14} />
            </button>
            <button
              className={`search-toggle ${showReplace ? 'active' : ''}`}
              onClick={() => setShowReplace(!showReplace)}
              title="Toggle Replace"
            >
              <Replace size={14} />
            </button>
          </div>
        </div>

        {showReplace && (
          <div className="search-replace-row">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace..."
              className="search-input"
            />
          </div>
        )}
      </div>

      {isSearching && (
        <div className="search-status">
          <Loader2 size={14} className="spin" /> Searching...
        </div>
      )}

      {!isSearching && totalMatches > 0 && (
        <div className="search-status">
          {totalMatches} results in {filesWithMatches} files
        </div>
      )}

      <div className="search-results">
        {Object.entries(groupedResults).map(([path, matches]) => (
          <div key={path} className="search-result-group">
            <div className="search-result-file" onClick={() => onFileSelect(path)}>
              <span className="search-result-path">{path.replace(projectPath + '/', '')}</span>
              <span className="search-result-count">{matches.length}</span>
            </div>
            {matches.map((match, i) => (
              <div
                key={i}
                className="search-result-item"
                onClick={() => onFileSelect(path, match.line)}
              >
                <span className="search-result-line">{match.line}</span>
                <span className="search-result-text">{match.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
