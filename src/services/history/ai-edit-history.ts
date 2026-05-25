const MAX_CHECKPOINTS = 50;

export interface EditCheckpoint {
  id: string;
  timestamp: number;
  description: string;
  files: EditCheckpointFile[];
  type: 'ai_edit' | 'inline_edit' | 'composer' | 'agent' | 'manual';
}

export interface EditCheckpointFile {
  path: string;
  contentBefore: string;
  contentAfter: string;
}

class AIEditHistory {
  private checkpoints: EditCheckpoint[] = [];
  private currentIndex = -1;

  createCheckpoint(description: string, files: EditCheckpointFile[], type: EditCheckpoint['type'] = 'ai_edit'): string {
    if (this.currentIndex < this.checkpoints.length - 1) {
      this.checkpoints = this.checkpoints.slice(0, this.currentIndex + 1);
    }

    const checkpoint: EditCheckpoint = {
      id: `edit-cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      description,
      files,
      type,
    };

    this.checkpoints.push(checkpoint);
    this.currentIndex = this.checkpoints.length - 1;

    if (this.checkpoints.length > MAX_CHECKPOINTS) {
      const excess = this.checkpoints.length - MAX_CHECKPOINTS;
      this.checkpoints = this.checkpoints.slice(excess);
      this.currentIndex -= excess;
    }

    return checkpoint.id;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.checkpoints.length - 1;
  }

  undo(): EditCheckpoint | null {
    if (!this.canUndo()) return null;
    const checkpoint = this.checkpoints[this.currentIndex];
    this.currentIndex--;
    return checkpoint;
  }

  redo(): EditCheckpoint | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.checkpoints[this.currentIndex];
  }

  getCheckpoint(id: string): EditCheckpoint | null {
    return this.checkpoints.find((cp) => cp.id === id) || null;
  }

  restoreTo(id: string): EditCheckpoint | null {
    const idx = this.checkpoints.findIndex((cp) => cp.id === id);
    if (idx < 0) return null;
    this.currentIndex = idx;
    return this.checkpoints[idx];
  }

  getHistory(): EditCheckpoint[] {
    return [...this.checkpoints];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  clear(): void {
    this.checkpoints = [];
    this.currentIndex = -1;
  }

  getUndoDescription(): string | null {
    if (!this.canUndo()) return null;
    return this.checkpoints[this.currentIndex].description;
  }

  getRedoDescription(): string | null {
    if (!this.canRedo()) return null;
    return this.checkpoints[this.currentIndex + 1].description;
  }
}

export const aiEditHistory = new AIEditHistory();
