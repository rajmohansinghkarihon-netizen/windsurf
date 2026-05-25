import React, { useState } from 'react';
import { useAgentStore } from '../../store/agentStore';
import { Plus, Play, CheckCircle2, AlertCircle, Clock, Pause, Trash2 } from 'lucide-react';
import type { AgentTaskStatus } from '../../types';

const COLUMNS: { id: AgentTaskStatus; label: string; color: string }[] = [
  { id: 'pending', label: 'Backlog', color: '#6b7280' },
  { id: 'queued', label: 'Queued', color: '#3b82f6' },
  { id: 'planning', label: 'Planning', color: '#8b5cf6' },
  { id: 'executing', label: 'In Progress', color: '#f59e0b' },
  { id: 'verifying', label: 'Verifying', color: '#6366f1' },
  { id: 'completed', label: 'Done', color: '#10b981' },
  { id: 'failed', label: 'Failed', color: '#ef4444' },
];

const statusIcon = (status: AgentTaskStatus) => {
  switch (status) {
    case 'executing': return <Play size={12} />;
    case 'completed': return <CheckCircle2 size={12} />;
    case 'failed': return <AlertCircle size={12} />;
    case 'paused': return <Pause size={12} />;
    default: return <Clock size={12} />;
  }
};

export const KanbanBoard: React.FC = () => {
  const { tasks, addTask, updateTask, removeTask, setActiveTask } = useAgentStore();
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTask({
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      status: 'pending',
      steps: [],
      currentStep: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setNewTaskTitle('');
    setNewTaskDesc('');
    setShowNewTask(false);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: AgentTaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      updateTask(taskId, { status: targetStatus });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="kanban-board">
      <div className="kanban-header">
        <h3>Agent Task Board</h3>
        <button className="kanban-add-btn" onClick={() => setShowNewTask(true)}>
          <Plus size={14} /> New Task
        </button>
      </div>

      {showNewTask && (
        <div className="kanban-new-task">
          <input
            type="text"
            placeholder="Task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)..."
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            rows={2}
          />
          <div className="kanban-new-task-actions">
            <button onClick={handleAddTask}>Add</button>
            <button onClick={() => setShowNewTask(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="kanban-columns">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="kanban-column"
              onDrop={(e) => handleDrop(e, col.id)}
              onDragOver={handleDragOver}
            >
              <div className="kanban-column-header" style={{ borderTopColor: col.color }}>
                <span>{col.label}</span>
                <span className="kanban-count">{columnTasks.length}</span>
              </div>
              <div className="kanban-cards">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => setActiveTask(task.id)}
                  >
                    <div className="kanban-card-header">
                      {statusIcon(task.status)}
                      <span className="kanban-card-title">{task.title}</span>
                      <button
                        className="kanban-card-delete"
                        onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {task.description && (
                      <p className="kanban-card-desc">{task.description}</p>
                    )}
                    {task.steps.length > 0 && (
                      <div className="kanban-card-progress">
                        {task.steps.filter((s) => s.status === 'completed').length}/{task.steps.length} steps
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
