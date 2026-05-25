import { readFile } from '../tauri';

const RULE_FILES = [
  '.zenith/rules.md',
  '.cursorrules',
  '.cursorrc',
  '.zenith/instructions.md',
];

export interface ProjectRulesResult {
  content: string;
  source: string;
  found: boolean;
}

export async function loadProjectRules(projectPath: string): Promise<ProjectRulesResult> {
  for (const ruleFile of RULE_FILES) {
    const fullPath = `${projectPath}/${ruleFile}`;
    try {
      const content = await readFile(fullPath);
      if (content.trim()) {
        return { content: content.trim(), source: ruleFile, found: true };
      }
    } catch {
      continue;
    }
  }

  return { content: '', source: '', found: false };
}

export function injectRulesIntoPrompt(systemPrompt: string, rules: string): string {
  if (!rules.trim()) return systemPrompt;

  return `${systemPrompt}

## Project-Specific Rules
The following rules are defined by the project maintainers. You MUST follow them:

${rules}`;
}

export async function saveProjectRules(projectPath: string, rules: string): Promise<void> {
  const { writeFile, createDirectory } = await import('../tauri');
  const dirPath = `${projectPath}/.zenith`;
  try {
    await createDirectory(dirPath);
  } catch {
    // Directory might already exist
  }
  await writeFile(`${dirPath}/rules.md`, rules);
}

export function getDefaultRulesTemplate(): string {
  return `# Project Rules for Zenith AI

## Code Style
- Follow existing conventions in the codebase
- Use TypeScript strict mode

## Architecture
- Keep components small and focused
- Use the established patterns

## Testing
- Write tests for new features
- Maintain existing test coverage

## AI Instructions
- Prefer minimal, targeted changes
- Always include necessary imports
- Do not modify test files unless asked
`;
}
