import type { ParsedResponse } from '../types';

export const SYSTEM_PROMPT = `You are Zenith, an expert AI coding assistant built into the Zenith IDE. You help users modify, create, debug, refactor, and understand code.

## How You Work
1. The user describes what they want in natural language
2. You receive the project structure, file contents, and other context
3. You analyze the request and produce the necessary code changes
4. Your changes are applied to the actual files with diff preview

## Response Format
Use the exact format below. This format is parsed by the system.

### For file changes:
===FILE: path/to/file.py===
<entire new content of the file>
===END_FILE===

### For creating new files:
===FILE: path/to/new_file.py===
<content of the new file>
===END_FILE===

### For deleting files:
===DELETE: path/to/file_to_delete.py===

### For terminal commands:
===CMD: npm install express===
===CMD: pip install requests===

## Rules
- ALWAYS include the COMPLETE file content in FILE blocks
- Use correct relative file paths
- Multiple FILE/CMD/DELETE blocks per response are fine
- Brief explanation before blocks (2-3 sentences max)
- Follow existing code style and conventions
- Add necessary imports
- Don't remove existing functionality unless asked
`;

export const AGENT_SYSTEM_PROMPT = `You are Zenith Agent, an autonomous AI coding assistant. You operate in a Plan-Act-Verify loop.

## Your Capabilities
- Read and write files
- Create and delete files
- Run terminal commands
- Search project code
- Git operations

## Planning
When given a task, create a step-by-step plan using available tools.
Return a JSON array of steps.

## Safety Rules
- Never delete files without explicit instruction
- Never run destructive commands
- Always create checkpoints before major changes
- Prefer minimal, targeted edits
- Verify changes compile and pass tests when possible

## Step Format
Each step must have:
- type: One of read_file, write_file, create_file, delete_file, run_command, search_project
- description: Human-readable description
- input: Object with parameters for the tool
`;

export const INLINE_EDIT_PROMPT = `You are Zenith, an AI coding assistant. The user has selected code and wants you to modify it.

## Instructions
- Return ONLY the modified code, no explanations
- Preserve indentation and style
- Make only the requested change
- Do not add markdown code fences

Selected code:
\`\`\`
{SELECTED_CODE}
\`\`\`

User instruction: {INSTRUCTION}

Return the modified code:`;

export const GHOST_TEXT_PROMPT = `You are a code completion engine. Given the code context, predict the next few tokens the user would type.

Rules:
- Return ONLY the completion text, no explanations
- Keep completions short (1-3 lines max)
- Match the coding style
- Do not repeat existing code
- If unsure, return empty string

Code before cursor:
\`\`\`
{PREFIX}
\`\`\`

Code after cursor:
\`\`\`
{SUFFIX}
\`\`\`

Complete:`;

export const COMMIT_MESSAGE_PROMPT = `Generate a concise, conventional commit message for the following git diff.

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, refactor, docs, style, test, chore, perf
- Keep the first line under 72 characters
- Add body only if the change is complex
- Return ONLY the commit message, nothing else

Git diff:
\`\`\`diff
{DIFF}
\`\`\``;

export const CODE_REVIEW_PROMPT = `Review the following code changes and provide feedback.

Focus on:
1. Bugs or logic errors
2. Security vulnerabilities
3. Performance issues
4. Code style and best practices
5. Missing error handling
6. Potential edge cases

Be concise and actionable. Use bullet points.

Changes:
\`\`\`diff
{DIFF}
\`\`\``;

export const TEST_GENERATION_PROMPT = `Generate comprehensive tests for the following code.

Rules:
- Use the testing framework already used in the project
- Cover happy path, edge cases, and error cases
- Use descriptive test names
- Follow existing test patterns in the project
- Return complete test file content in FILE block format

Code to test:
\`\`\`
{CODE}
\`\`\`

File path: {FILE_PATH}`;

export function parseResponse(text: string, existingFiles: Set<string>): ParsedResponse {
  const result: ParsedResponse = {
    explanation: '',
    fileChanges: [],
    deletions: [],
    commands: [],
  };

  let remaining = text;

  const isPathSafe = (p: string): boolean => {
    if (p.startsWith('/') || p.startsWith('\\')) return false;
    if (p.includes('..')) return false;
    if (/^[A-Za-z]:/.test(p)) return false;
    return true;
  };

  const filePattern = /===FILE:\s*(.+?)===\s*\n([\s\S]*?)===END_FILE===/g;
  let match;
  while ((match = filePattern.exec(remaining)) !== null) {
    const filePath = match[1].trim();
    if (!isPathSafe(filePath)) {
      console.warn(`Rejected unsafe file path: ${filePath}`);
      continue;
    }
    const content = match[2].replace(/^\n|\n$/g, '');
    result.fileChanges.push({
      path: filePath,
      content,
      isNew: !existingFiles.has(filePath),
    });
  }
  remaining = remaining.replace(filePattern, '');

  const deletePattern = /===DELETE:\s*(.+?)===/g;
  while ((match = deletePattern.exec(remaining)) !== null) {
    const delPath = match[1].trim();
    if (!isPathSafe(delPath)) continue;
    result.deletions.push(delPath);
  }
  remaining = remaining.replace(deletePattern, '');

  const cmdPattern = /===CMD:\s*(.+?)===/g;
  while ((match = cmdPattern.exec(remaining)) !== null) {
    result.commands.push(match[1].trim());
  }
  remaining = remaining.replace(cmdPattern, '');

  result.explanation = remaining.trim();
  return result;
}

export function generateDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const result: string[] = [];

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push(`  ${oldLines[i]}`);
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
      result.push(`+ ${newLines[j]}`);
      j++;
    } else if (i < oldLines.length) {
      result.push(`- ${oldLines[i]}`);
      i++;
    }
  }

  return result.join('\n');
}
