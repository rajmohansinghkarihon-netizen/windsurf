import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useSettingsStore } from '../store/settingsStore';
import { writeFile } from '../services/tauri';

export function useAutoSave(): void {
  const config = useSettingsStore((s) => s.config);
  const tabs = useEditorStore((s) => s.tabs);
  const markTabSaved = useEditorStore((s) => s.markTabSaved);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!config.autoSave) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const modifiedTabs = tabs.filter((t) => t.modified);
    if (modifiedTabs.length === 0) return;

    timerRef.current = setTimeout(async () => {
      for (const tab of modifiedTabs) {
        try {
          await writeFile(tab.path, tab.content);
          markTabSaved(tab.id);
        } catch (err) {
          console.error('Auto-save failed:', tab.path, err);
        }
      }
    }, config.autoSaveDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [config.autoSave, config.autoSaveDelay, tabs, markTabSaved]);
}
