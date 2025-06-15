
'use client';

import type { Task, KanbanStatus } from '@/types';
import { KanbanTaskCard } from './kanban-task-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '../ui/button';
import { Icons } from '../icons';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

interface KanbanColumnProps {
  status: string;
  title: string;
  tasks: Task[];
  onDropTask: (taskId: string, newStatus: string) => void;
  onEditTask: (task: Task) => void;
  onAddTask: (status: string) => void;
  onViewTask: (task: Task) => void;
  onMoveToBacklog: (taskId: string) => void;
}

export function KanbanColumn({
  status,
  title,
  tasks,
  onDropTask,
  onEditTask,
  onAddTask,
  onViewTask,
  onMoveToBacklog,
}: KanbanColumnProps) {
  const { appUser } = useAuth(); // Get appUser for role check
  const canModifyTasksInColumn = appUser?.role === 'Administrator' || appUser?.role === 'Manager' || appUser?.role === 'Supervisor';

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (canModifyTasksInColumn) {
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
        onDropTask(taskId, status);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    if (canModifyTasksInColumn) {
      e.dataTransfer.setData('taskId', taskId);
      e.dataTransfer.effectAllowed = "move";
    } else {
      e.preventDefault();
    }
  };

  return (
    <Card
      className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[340px] min-h-[300px] flex flex-col bg-secondary/50 rounded-lg shadow-sm"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-labelledby={`column-title-${status}`}
    >
      <CardHeader className="p-4 border-b border-border sticky top-0 bg-secondary/50 z-10 rounded-t-lg">
        <CardTitle id={`column-title-${status}`} className="text-lg font-semibold text-foreground flex justify-between items-center">
          {title} ({tasks.length})
          {canModifyTasksInColumn && (
            <Button variant="ghost" size="sm" onClick={() => onAddTask(status)} aria-label={`Add task to ${title}`}>
              <Icons.Add className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tasks here.</p>
          ) : (
            tasks.map((task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onDragStart={handleDragStart}
                onEditTask={onEditTask}
                onViewTask={onViewTask}
                onMoveToBacklog={onMoveToBacklog}
              />
            ))
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
