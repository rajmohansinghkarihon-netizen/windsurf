import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, ChevronRight, Check, FolderOpen, X } from 'lucide-react';
import { readFile, runTerminalCommand, writeFile, createDirectory } from '../../services/tauri';

interface DetectedConfig {
  language: string;
  framework: string;
  packageManager: string;
  testFramework: string;
  hasGit: boolean;
  hasTsConfig: boolean;
  hasDocker: boolean;
  hasZenithConfig: boolean;
  scripts: Record<string, string>;
}

interface WizardStep {
  title: string;
  description: string;
  completed: boolean;
  action?: () => Promise<void>;
}

interface Props {
  projectPath: string;
  onComplete: () => void;
  onDismiss: () => void;
}

export default function ProjectOnboardingWizard({ projectPath, onComplete, onDismiss }: Props) {
  const [detecting, setDetecting] = useState(true);
  const [config, setConfig] = useState<DetectedConfig | null>(null);
  const [steps, setSteps] = useState<WizardStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => setLog((prev) => [...prev, msg]), []);

  const buildSteps = useCallback((detected: DetectedConfig) => {
    const newSteps: WizardStep[] = [];

    if (!detected.hasGit) {
      newSteps.push({
        title: 'Initialize Git',
        description: 'Set up version control for the project',
        completed: false,
        action: async () => {
          addLog('Initializing git...');
          await runTerminalCommand('git init', projectPath);
          addLog('Git initialized.');
        },
      });
    }

    if (detected.packageManager !== 'unknown' && detected.language !== 'unknown') {
      const installCmd = detected.packageManager === 'npm' ? 'npm install'
        : detected.packageManager === 'yarn' ? 'yarn install'
        : detected.packageManager === 'pnpm' ? 'pnpm install'
        : detected.packageManager === 'cargo' ? 'cargo build'
        : detected.packageManager === 'pip' ? 'pip install -r requirements.txt'
        : detected.packageManager === 'poetry' ? 'poetry install'
        : detected.packageManager === 'go' ? 'go mod download'
        : 'echo "No install command"';

      newSteps.push({
        title: 'Install Dependencies',
        description: `Run ${installCmd}`,
        completed: false,
        action: async () => {
          addLog(`Running: ${installCmd}`);
          const result = await runTerminalCommand(installCmd, projectPath);
          addLog(result.exit_code === 0 ? 'Dependencies installed.' : `Install failed: ${result.stderr}`);
        },
      });
    }

    if (!detected.hasZenithConfig) {
      newSteps.push({
        title: 'Create Zenith Config',
        description: 'Generate .zenith/ directory with project rules',
        completed: false,
        action: async () => {
          addLog('Creating .zenith/ directory...');
          try { await createDirectory(`${projectPath}/.zenith`); } catch { /* exists */ }
          const rules = `# Project Rules for Zenith AI\n\n## Language: ${detected.language}\n## Framework: ${detected.framework}\n## Package Manager: ${detected.packageManager}\n\n- Follow existing code conventions\n- Use ${detected.language} idioms\n`;
          await writeFile(`${projectPath}/.zenith/rules.md`, rules);
          addLog('Zenith config created.');
        },
      });
    }

    if (detected.testFramework !== 'unknown') {
      const testCmd = detected.testFramework === 'vitest' ? 'npx vitest run'
        : detected.testFramework === 'jest' ? 'npx jest --no-coverage'
        : detected.testFramework === 'pytest' ? 'python -m pytest -v'
        : detected.testFramework === 'cargo test' ? 'cargo test'
        : detected.testFramework === 'go test' ? 'go test ./...'
        : 'echo "No test command"';

      newSteps.push({
        title: 'Verify Tests',
        description: `Run ${testCmd} to verify setup`,
        completed: false,
        action: async () => {
          addLog(`Running: ${testCmd}`);
          const result = await runTerminalCommand(testCmd, projectPath);
          addLog(result.exit_code === 0 ? 'Tests passed!' : `Tests: ${result.stdout.slice(0, 200)}`);
        },
      });
    }

    setSteps(newSteps);
  }, [projectPath, addLog]);

  const detectProject = useCallback(async () => {
    setDetecting(true);
    const detected: DetectedConfig = {
      language: 'unknown',
      framework: 'unknown',
      packageManager: 'unknown',
      testFramework: 'unknown',
      hasGit: false,
      hasTsConfig: false,
      hasDocker: false,
      hasZenithConfig: false,
      scripts: {},
    };

    try {
      const pkgJson = await readFile(`${projectPath}/package.json`).catch(() => '');
      if (pkgJson) {
        detected.language = 'typescript';
        const pkg = JSON.parse(pkgJson) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          scripts?: Record<string, string>;
        };
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (allDeps['react']) detected.framework = 'react';
        else if (allDeps['vue']) detected.framework = 'vue';
        else if (allDeps['@angular/core']) detected.framework = 'angular';
        else if (allDeps['next']) detected.framework = 'next.js';
        else if (allDeps['express']) detected.framework = 'express';

        if (allDeps['vitest']) detected.testFramework = 'vitest';
        else if (allDeps['jest']) detected.testFramework = 'jest';
        else if (allDeps['mocha']) detected.testFramework = 'mocha';

        detected.scripts = pkg.scripts || {};

        const yarnLock = await readFile(`${projectPath}/yarn.lock`).catch(() => '');
        const pnpmLock = await readFile(`${projectPath}/pnpm-lock.yaml`).catch(() => '');
        if (yarnLock) detected.packageManager = 'yarn';
        else if (pnpmLock) detected.packageManager = 'pnpm';
        else detected.packageManager = 'npm';
      }

      const cargoToml = await readFile(`${projectPath}/Cargo.toml`).catch(() => '');
      if (cargoToml) {
        detected.language = 'rust';
        detected.packageManager = 'cargo';
        detected.testFramework = 'cargo test';
      }

      const pyProject = await readFile(`${projectPath}/pyproject.toml`).catch(() => '');
      const requirements = await readFile(`${projectPath}/requirements.txt`).catch(() => '');
      if (pyProject || requirements) {
        detected.language = 'python';
        if (pyProject.includes('poetry')) detected.packageManager = 'poetry';
        else if (pyProject.includes('pdm')) detected.packageManager = 'pdm';
        else detected.packageManager = 'pip';
        detected.testFramework = 'pytest';
      }

      const goMod = await readFile(`${projectPath}/go.mod`).catch(() => '');
      if (goMod) {
        detected.language = 'go';
        detected.packageManager = 'go';
        detected.testFramework = 'go test';
      }

      await readFile(`${projectPath}/.git/HEAD`).then(() => { detected.hasGit = true; }).catch(() => {});
      await readFile(`${projectPath}/tsconfig.json`).then(() => { detected.hasTsConfig = true; }).catch(() => {});
      await readFile(`${projectPath}/Dockerfile`).then(() => { detected.hasDocker = true; }).catch(() => {});
      await readFile(`${projectPath}/.zenith/rules.md`).then(() => { detected.hasZenithConfig = true; }).catch(() => {});

    } catch {
      // Detection failed partially, that's okay
    }

    setConfig(detected);
    buildSteps(detected);
    setDetecting(false);
  }, [projectPath, buildSteps]);

  useEffect(() => {
    const handle = requestAnimationFrame(() => { detectProject(); });
    return () => cancelAnimationFrame(handle);
  }, [detectProject]);

  const runStep = async (index: number) => {
    if (!steps[index]?.action) return;
    setRunning(true);
    setCurrentStep(index);
    try {
      await steps[index].action!();
      setSteps((prev) => prev.map((s, i) => i === index ? { ...s, completed: true } : s));
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setRunning(false);
  };

  const runAll = async () => {
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].completed && steps[i].action) {
        await runStep(i);
      }
    }
    onComplete();
  };

  if (detecting) {
    return (
      <div className="onboarding-wizard">
        <div className="onboarding-detecting">
          <Loader2 size={24} className="spin" />
          <p>Detecting project configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-header">
        <FolderOpen size={16} />
        <h3>Project Onboarding</h3>
        <button className="icon-btn-sm" onClick={onDismiss}><X size={16} /></button>
      </div>

      {config && (
        <div className="onboarding-detected">
          <h4><Sparkles size={14} /> Detected Configuration</h4>
          <div className="detected-grid">
            <span>Language:</span><strong>{config.language}</strong>
            <span>Framework:</span><strong>{config.framework}</strong>
            <span>Package Manager:</span><strong>{config.packageManager}</strong>
            <span>Test Framework:</span><strong>{config.testFramework}</strong>
            <span>Git:</span><strong>{config.hasGit ? 'Yes' : 'No'}</strong>
            <span>TypeScript:</span><strong>{config.hasTsConfig ? 'Yes' : 'No'}</strong>
            <span>Docker:</span><strong>{config.hasDocker ? 'Yes' : 'No'}</strong>
          </div>
        </div>
      )}

      <div className="onboarding-steps">
        <h4>Setup Steps</h4>
        {steps.length === 0 ? (
          <p className="help-text">Project appears to be fully configured!</p>
        ) : (
          steps.map((step, index) => (
            <div key={index} className={`onboarding-step ${step.completed ? 'completed' : ''} ${currentStep === index && running ? 'running' : ''}`}>
              <div className="step-indicator">
                {step.completed ? <Check size={14} className="text-green" /> : <span className="step-number">{index + 1}</span>}
              </div>
              <div className="step-info">
                <span className="step-title">{step.title}</span>
                <span className="step-desc">{step.description}</span>
              </div>
              {!step.completed && (
                <button
                  className="btn-secondary small"
                  onClick={() => runStep(index)}
                  disabled={running}
                >
                  {running && currentStep === index ? <Loader2 size={12} className="spin" /> : <ChevronRight size={12} />}
                  Run
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {steps.length > 0 && (
        <div className="onboarding-actions">
          <button className="btn-primary" onClick={runAll} disabled={running}>
            Run All Steps
          </button>
          <button className="btn-secondary" onClick={onComplete}>Skip Setup</button>
        </div>
      )}

      {log.length > 0 && (
        <div className="onboarding-log">
          {log.map((entry, i) => <div key={i} className="log-entry">{entry}</div>)}
        </div>
      )}
    </div>
  );
}
