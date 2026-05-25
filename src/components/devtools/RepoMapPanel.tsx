import React, { useState, useCallback } from 'react';
import { Map, GitBranch, Network, Search, RefreshCw, FileCode } from 'lucide-react';
import { projectIndexer } from '../../services/indexing/projectIndexer';
import type { IndexingProgress } from '../../services/indexing/projectIndexer';
import { useFileStore } from '../../store/fileStore';

type ViewMode = 'symbols' | 'dependencies' | 'map';

export const RepoMapPanel: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [indexingProgress, setIndexingProgress] = useState<IndexingProgress | null>(null);
  const [repoMap, setRepoMap] = useState('');
  const [symbolResults, setSymbolResults] = useState<Array<{ name: string; kind: string; line: number; filePath: string }>>([]);
  const [depGraph, setDepGraph] = useState<Array<{ path: string; imports: string[]; importedBy: string[] }>>([]);
  const { files, projectPath } = useFileStore();

  const startIndexing = useCallback(async () => {
    if (!projectPath || files.length === 0) return;
    projectIndexer.setProgressCallback((progress) => {
      setIndexingProgress({ ...progress });
    });
    await projectIndexer.indexProject(files, projectPath);
    setRepoMap(projectIndexer.getRepoMap());

    const deps = projectIndexer.getDependencyGraph();
    setDepGraph(
      Array.from(deps.values()).map((d) => ({
        path: d.path,
        imports: d.imports,
        importedBy: d.importedBy,
      }))
    );
  }, [files, projectPath]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const results = projectIndexer.searchSymbols(searchQuery);
    setSymbolResults(results.slice(0, 50));
    setViewMode('symbols');
  };

  return (
    <div className="repo-map-panel">
      <div className="repo-map-header">
        <div className="repo-map-tabs">
          <button
            className={viewMode === 'map' ? 'active' : ''}
            onClick={() => setViewMode('map')}
          >
            <Map size={12} /> Repo Map
          </button>
          <button
            className={viewMode === 'symbols' ? 'active' : ''}
            onClick={() => setViewMode('symbols')}
          >
            <FileCode size={12} /> Symbols
          </button>
          <button
            className={viewMode === 'dependencies' ? 'active' : ''}
            onClick={() => setViewMode('dependencies')}
          >
            <Network size={12} /> Dependencies
          </button>
        </div>
        <button className="repo-map-index-btn" onClick={startIndexing} title="Index Project">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="repo-map-search">
        <Search size={12} />
        <input
          placeholder="Search symbols..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>

      {indexingProgress && indexingProgress.status === 'indexing' && (
        <div className="repo-map-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${indexingProgress.totalFiles > 0
                  ? (indexingProgress.filesProcessed / indexingProgress.totalFiles) * 100
                  : 0}%`,
              }}
            />
          </div>
          <span>
            Indexing: {indexingProgress.filesProcessed}/{indexingProgress.totalFiles}
          </span>
        </div>
      )}

      <div className="repo-map-content">
        {viewMode === 'map' && (
          <div className="repo-map-view">
            {repoMap ? (
              <pre className="repo-map-text">{repoMap}</pre>
            ) : (
              <div className="repo-map-empty">
                <Map size={24} />
                <p>Click the refresh button to index the project</p>
                <span>This will analyze all source files and build a symbol map</span>
              </div>
            )}
          </div>
        )}

        {viewMode === 'symbols' && (
          <div className="symbol-list">
            {symbolResults.length === 0 ? (
              <div className="repo-map-empty">
                <FileCode size={24} />
                <p>Search for symbols across the project</p>
              </div>
            ) : (
              symbolResults.map((sym, i) => (
                <div key={i} className="symbol-item">
                  <span className={`symbol-kind ${sym.kind}`}>{sym.kind}</span>
                  <span className="symbol-name">{sym.name}</span>
                  <span className="symbol-location">
                    {sym.filePath.split('/').pop()}:L{sym.line}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'dependencies' && (
          <div className="dependency-graph">
            {depGraph.length === 0 ? (
              <div className="repo-map-empty">
                <Network size={24} />
                <p>Index the project to see the dependency graph</p>
              </div>
            ) : (
              depGraph
                .filter((d) => d.imports.length > 0 || d.importedBy.length > 0)
                .map((dep) => (
                  <div key={dep.path} className="dep-node">
                    <div className="dep-node-name">
                      <GitBranch size={12} />
                      {dep.path.split('/').pop()}
                    </div>
                    {dep.imports.length > 0 && (
                      <div className="dep-imports">
                        <span className="dep-label">imports:</span>
                        {dep.imports.map((imp, i) => (
                          <span key={i} className="dep-ref">{imp}</span>
                        ))}
                      </div>
                    )}
                    {dep.importedBy.length > 0 && (
                      <div className="dep-imported-by">
                        <span className="dep-label">used by:</span>
                        {dep.importedBy.map((imp, i) => (
                          <span key={i} className="dep-ref">{imp.split('/').pop()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
