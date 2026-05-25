import type { FileEntry, MentionContext, ChatMessage } from '../../types';
import { readFile } from '../tauri';
import { searchWeb, formatSearchResults } from './webSearch';

export function buildFileTree(files: FileEntry[], prefix = ''): string {
  let result = '';
  for (const f of files) {
    if (f.is_dir) {
      result += `${prefix}${f.name}/\n`;
      if (f.children) {
        result += buildFileTree(f.children, prefix + '  ');
      }
    } else {
      result += `${prefix}${f.name}\n`;
    }
  }
  return result;
}

export async function resolveFileContent(path: string): Promise<string> {
  try {
    const content = await readFile(path);
    return content;
  } catch {
    return `[Error reading file: ${path}]`;
  }
}

export async function resolveMentionContext(mention: MentionContext, _projectPath: string): Promise<string> {
  switch (mention.type) {
    case '@file': {
      const content = await resolveFileContent(mention.value);
      return `\n### File: ${mention.value}\n\`\`\`\n${content}\n\`\`\`\n`;
    }
    case '@folder': {
      return `\n### Folder: ${mention.value}\n[Folder contents included in context]\n`;
    }
    case '@selection': {
      return `\n### Selected Code\n\`\`\`\n${mention.value}\n\`\`\`\n`;
    }
    case '@git': {
      return `\n### Git Context\n${mention.resolvedContent || '[Git info]'}\n`;
    }
    case '@terminal': {
      return `\n### Terminal Output\n\`\`\`\n${mention.resolvedContent || '[Terminal output]'}\n\`\`\`\n`;
    }
    case '@problems': {
      return `\n### Diagnostics/Problems\n${mention.resolvedContent || '[No problems]'}\n`;
    }
    case '@codebase': {
      return `\n### Codebase Context\n[Full codebase indexed and available for reference]\n`;
    }
    case '@web': {
      if (mention.resolvedContent) {
        return `\n### Web Search: ${mention.value}\n${mention.resolvedContent}\n`;
      }
      if (mention.value) {
        const results = await searchWeb(mention.value);
        const formatted = formatSearchResults(results);
        return `\n### Web Search: ${mention.value}\n${formatted}\n`;
      }
      return `\n### Web Search\n[No query specified]\n`;
    }
    case '@docs': {
      return `\n### Documentation: ${mention.value}\n${mention.resolvedContent || '[Documentation]'}\n`;
    }
    default:
      return '';
  }
}

export async function buildAIContext(options: {
  userPrompt: string;
  files: FileEntry[];
  mentions: MentionContext[];
  currentFile?: { path: string; content: string };
  selectedText?: string;
  diagnostics?: string;
  gitDiff?: string;
  terminalOutput?: string;
  projectPath: string;
  customInstructions?: string;
  projectRules?: string;
  conversationHistory?: ChatMessage[];
}): Promise<string> {
  const parts: string[] = [];

  if (options.customInstructions) {
    parts.push(`# Custom Instructions\n${options.customInstructions}\n`);
  }

  if (options.projectRules) {
    parts.push(`# Project Rules\n${options.projectRules}\n`);
  }

  parts.push(`# Project Structure\n\`\`\`\n${buildFileTree(options.files)}\`\`\`\n`);

  if (options.currentFile) {
    parts.push(`# Current File: ${options.currentFile.path}\n\`\`\`\n${options.currentFile.content}\n\`\`\`\n`);
  }

  if (options.selectedText) {
    parts.push(`# Selected Code\n\`\`\`\n${options.selectedText}\n\`\`\`\n`);
  }

  for (const mention of options.mentions) {
    const resolved = await resolveMentionContext(mention, options.projectPath);
    if (resolved) parts.push(resolved);
  }

  if (options.diagnostics) {
    parts.push(`# Current Errors/Warnings\n${options.diagnostics}\n`);
  }

  if (options.gitDiff) {
    parts.push(`# Uncommitted Changes (git diff)\n\`\`\`diff\n${options.gitDiff}\n\`\`\`\n`);
  }

  if (options.terminalOutput) {
    parts.push(`# Recent Terminal Output\n\`\`\`\n${options.terminalOutput}\n\`\`\`\n`);
  }

  if (options.conversationHistory && options.conversationHistory.length > 0) {
    const recent = options.conversationHistory.slice(-6);
    const historyStr = recent
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 500)}`)
      .join('\n\n');
    parts.push(`# Conversation History\n${historyStr}\n`);
  }

  parts.push(`# Request\n${options.userPrompt}`);

  return parts.join('\n');
}

export function parseMentions(input: string): { cleanText: string; mentions: MentionContext[] } {
  const mentions: MentionContext[] = [];
  const mentionPattern = /@(file|folder|codebase|web|docs|git|terminal|selection|problems)(?:\s*\(([^)]+)\)|\s+(\S+))?/g;
  let match;

  while ((match = mentionPattern.exec(input)) !== null) {
    const type = `@${match[1]}` as MentionContext['type'];
    const value = match[2] || match[3] || '';
    mentions.push({ type, value });
  }

  const cleanText = input.replace(mentionPattern, '').trim();
  return { cleanText, mentions };
}
