
'use client';

import type { Task, User } from '@/types';
import { BacklogListItem } from './backlog-list-item';

interface BacklogListProps {
  tasks: Task[];
  // users: User[]; // Removed users prop, will be fetched from context in BacklogListItem
  onMoveToBoard: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
}

export function BacklogList({ tasks, onMoveToBoard, onEditTask, onViewTask }: BacklogListProps) {
  if (!tasks || tasks.length === 0) {
    return <p className="text-muted-foreground">The backlog is currently empty for this project.</p>;
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <BacklogListItem
          key={task.id}
          task={task}
          // user prop removed
          onMoveToBoard={onMoveToBoard}
          onEditTask={onEditTask}
          onViewTask={onViewTask}
        />
      ))}
    </div>
  );
}
