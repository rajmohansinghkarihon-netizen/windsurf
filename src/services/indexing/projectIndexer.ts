import type { FileEntry } from '../../types';
import { readFile } from '../tauri';

export interface IndexedFile {
  path: string;
  content: string;
  language: string;
  symbols: SymbolInfo[];
  imports: string[];
  exports: string[];
  lastIndexed: number;
}

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'constant' | 'enum' | 'method' | 'property';
  line: number;
  endLine?: number;
  exported: boolean;
  signature?: string;
}

export interface DependencyNode {
  path: string;
  imports: string[];
  importedBy: string[];
}

export interface RepoMap {
  files: IndexedFile[];
  symbols: Map<string, SymbolInfo[]>;
  dependencies: Map<string, DependencyNode>;
  totalFiles: number;
  totalSymbols: number;
  lastFullIndex: number;
}

export type IndexingStatus = 'idle' | 'indexing' | 'complete' | 'error';

export interface IndexingProgress {
  status: IndexingStatus;
  filesProcessed: number;
  totalFiles: number;
  currentFile: string;
  errors: string[];
}

const SYMBOL_PATTERNS: Record<string, RegExp[]> = {
  typescript: [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
    /(?:export\s+)?class\s+(\w+)/g,
    /(?:export\s+)?interface\s+(\w+)/g,
    /(?:export\s+)?type\s+(\w+)\s*=/g,
    /(?:export\s+)?(?:const|let|var)\s+(\w+)/g,
    /(?:export\s+)?enum\s+(\w+)/g,
  ],
  python: [
    /def\s+(\w+)/g,
    /class\s+(\w+)/g,
  ],
  rust: [
    /(?:pub\s+)?fn\s+(\w+)/g,
    /(?:pub\s+)?struct\s+(\w+)/g,
    /(?:pub\s+)?enum\s+(\w+)/g,
    /(?:pub\s+)?trait\s+(\w+)/g,
    /(?:pub\s+)?type\s+(\w+)/g,
  ],
};

const IMPORT_PATTERNS: Record<string, RegExp> = {
  typescript: /import\s+.*?from\s+['"](.+?)['"]/g,
  python: /(?:from\s+(\S+)\s+import|import\s+(\S+))/g,
  rust: /use\s+(.+?);/g,
};

function detectLanguageGroup(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) return 'typescript';
  if (['py', 'pyw'].includes(ext)) return 'python';
  if (['rs'].includes(ext)) return 'rust';
  return 'unknown';
}

function extractSymbols(content: string, language: string): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];
  const patterns = SYMBOL_PATTERNS[language] || [];
  const lines = content.split('\n');

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const beforeMatch = content.substring(0, match.index);
      const line = beforeMatch.split('\n').length;
      const exported = match[0].startsWith('export') || match[0].startsWith('pub');

      let kind: SymbolInfo['kind'] = 'variable';
      if (/function|def|fn/.test(match[0])) kind = 'function';
      else if (/class/.test(match[0])) kind = 'class';
      else if (/interface/.test(match[0])) kind = 'interface';
      else if (/\btype\b/.test(match[0])) kind = 'type';
      else if (/enum/.test(match[0])) kind = 'enum';
      else if (/const/.test(match[0])) kind = 'constant';
      else if (/struct/.test(match[0])) kind = 'class';
      else if (/trait/.test(match[0])) kind = 'interface';

      symbols.push({
        name: match[1],
        kind,
        line,
        exported,
        signature: lines[line - 1]?.trim(),
      });
    }
  }

  return symbols;
}

function extractImports(content: string, language: string): string[] {
  const imports: string[] = [];
  const pattern = IMPORT_PATTERNS[language];
  if (!pattern) return imports;

  const regex = new RegExp(pattern.source, pattern.flags);
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1] || match[2] || '');
  }

  return imports.filter(Boolean);
}

export class ProjectIndexer {
  private index: RepoMap = {
    files: [],
    symbols: new Map(),
    dependencies: new Map(),
    totalFiles: 0,
    totalSymbols: 0,
    lastFullIndex: 0,
  };
  private progress: IndexingProgress = {
    status: 'idle',
    filesProcessed: 0,
    totalFiles: 0,
    currentFile: '',
    errors: [],
  };
  private onProgressUpdate?: (progress: IndexingProgress) => void;

  setProgressCallback(callback: (progress: IndexingProgress) => void): void {
    this.onProgressUpdate = callback;
  }

  async indexProject(files: FileEntry[], _projectPath: string): Promise<void> {
    const filePaths = this.flattenFiles(files);
    this.progress = {
      status: 'indexing',
      filesProcessed: 0,
      totalFiles: filePaths.length,
      currentFile: '',
      errors: [],
    };
    this.notifyProgress();

    this.index.files = [];
    this.index.symbols.clear();
    this.index.dependencies.clear();

    for (const filePath of filePaths) {
      this.progress.currentFile = filePath;
      this.notifyProgress();

      try {
        const content = await readFile(filePath);
        const language = detectLanguageGroup(filePath);
        const symbols = extractSymbols(content, language);
        const imports = extractImports(content, language);
        const exports = symbols.filter((s) => s.exported).map((s) => s.name);

        const indexedFile: IndexedFile = {
          path: filePath,
          content,
          language,
          symbols,
          imports,
          exports,
          lastIndexed: Date.now(),
        };

        this.index.files.push(indexedFile);
        this.index.symbols.set(filePath, symbols);
        this.index.dependencies.set(filePath, {
          path: filePath,
          imports,
          importedBy: [],
        });
      } catch (err) {
        this.progress.errors.push(`Failed to index ${filePath}: ${err}`);
      }

      this.progress.filesProcessed++;
      this.notifyProgress();
    }

    this.buildDependencyGraph();

    this.index.totalFiles = this.index.files.length;
    this.index.totalSymbols = Array.from(this.index.symbols.values())
      .reduce((sum, syms) => sum + syms.length, 0);
    this.index.lastFullIndex = Date.now();

    this.progress.status = 'complete';
    this.notifyProgress();
  }

  private buildDependencyGraph(): void {
    for (const [filePath, node] of this.index.dependencies) {
      for (const imp of node.imports) {
        for (const [otherPath, otherNode] of this.index.dependencies) {
          if (otherPath !== filePath && otherPath.includes(imp.replace(/\./g, '/'))) {
            otherNode.importedBy.push(filePath);
          }
        }
      }
    }
  }

  searchSymbols(query: string): Array<SymbolInfo & { filePath: string }> {
    const results: Array<SymbolInfo & { filePath: string }> = [];
    const lowerQuery = query.toLowerCase();

    for (const [filePath, symbols] of this.index.symbols) {
      for (const symbol of symbols) {
        if (symbol.name.toLowerCase().includes(lowerQuery)) {
          results.push({ ...symbol, filePath });
        }
      }
    }

    return results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  getRepoMap(): string {
    const lines: string[] = ['# Repository Map\n'];

    for (const file of this.index.files) {
      if (file.symbols.length === 0) continue;

      lines.push(`## ${file.path}`);
      for (const sym of file.symbols) {
        const exportPrefix = sym.exported ? '⬤ ' : '  ';
        lines.push(`${exportPrefix}${sym.kind}: ${sym.name} (L${sym.line})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  getDependencyGraph(): Map<string, DependencyNode> {
    return this.index.dependencies;
  }

  getSymbolGraph(): Array<{ from: string; to: string; symbol: string }> {
    const edges: Array<{ from: string; to: string; symbol: string }> = [];

    for (const file of this.index.files) {
      for (const imp of file.imports) {
        edges.push({ from: file.path, to: imp, symbol: imp.split('/').pop() || imp });
      }
    }

    return edges;
  }

  getIndexedFiles(): IndexedFile[] {
    return this.index.files;
  }

  getProgress(): IndexingProgress {
    return this.progress;
  }

  private flattenFiles(files: FileEntry[]): string[] {
    const result: string[] = [];
    const indexableExtensions = new Set([
      'ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'rb', 'php',
      'c', 'cpp', 'h', 'hpp', 'cs', 'swift', 'kt', 'scala', 'vue', 'svelte',
    ]);

    const walk = (entries: FileEntry[]) => {
      for (const entry of entries) {
        if (entry.is_dir && entry.children) {
          walk(entry.children);
        } else if (!entry.is_dir) {
          const ext = entry.name.split('.').pop()?.toLowerCase() || '';
          if (indexableExtensions.has(ext)) {
            result.push(entry.path);
          }
        }
      }
    };
    walk(files);
    return result;
  }

  private notifyProgress(): void {
    this.onProgressUpdate?.(this.progress);
  }
}

export const projectIndexer = new ProjectIndexer();
