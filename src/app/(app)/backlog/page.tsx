
'use client';

import { useAppData } from '@/contexts/app-data-context';
import { BacklogList } from '@/components/backlog/backlog-list';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { BACKLOG_STATUS_ID } from '@/config/site';
import type { Task, KanbanStatus } from '@/types';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

export default function BacklogPage() {
  // isLoading now reflects Firestore loading state
  const { tasks, users, selectedProjectId, isLoading, projects, updateTask, openCreateTaskDialog, openViewTaskDialog } = useAppData();

  const handleMoveToBoard = (taskId: string) => {
    const taskToMove = tasks.find(t => t.id === taskId);
    if (taskToMove) {
      // Ensure updateTask receives a complete Task object, potentially converting date fields
      updateTask({ ...taskToMove, status: 'todo' });
    }
  };

  const handleEditTask = (task: Task) => {
    if (openCreateTaskDialog) {
        // Pass the task object as is; the dialog will handle form population
      openCreateTaskDialog(task.status, task, task.projectId);
    } else {
        console.warn("openCreateTaskDialog function not available on context for editing task from backlog.");
    }
  };

  const handleViewTask = (task: Task) => {
    if (openViewTaskDialog) {
      openViewTaskDialog(task);
    } else {
      console.warn("openViewTaskDialog function not available on context for viewing task from backlog.");
    }
  };

  // Use the isLoading flag from the context
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-4">
        <Skeleton className="h-10 w-1/3 mb-6" /> {/* Title Skeleton */}
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" /> // Task Item Skeleton
        ))}
      </div>
    );
  }

  if (projects.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Icons.Project className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Projects Yet</h2>
        <p className="text-muted-foreground mb-4">Create a project to start organizing your backlog.</p>
      </div>
    );
  }

  if (!selectedProjectId && projects.length > 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">Please select a project to view its backlog.</p>
      </div>
    );
  }

  const backlogTasks = selectedProjectId
    ? tasks.filter(task => 
        task.projectId === selectedProjectId && 
        task.status === BACKLOG_STATUS_ID &&
        task.issueType !== 'epic' // Exclude epics from backlog list
      )
           .sort((a, b) => (a.createdAt?.getTime() ?? 0) > (b.createdAt?.getTime() ?? 0) ? -1 : 1) // Sort by Date object
    : [];

  const projectName = projects.find(p => p.id === selectedProjectId)?.name || "Selected Project";

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Backlog for {projectName}</h1>
      {selectedProjectId ? (
        backlogTasks.length > 0 ? (
          <BacklogList
            tasks={backlogTasks}
            onMoveToBoard={handleMoveToBoard}
            onEditTask={handleEditTask}
            onViewTask={handleViewTask}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center border border-dashed rounded-lg">
            <Icons.Backlog className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Backlog is Empty</h2>
            <p className="text-muted-foreground">Add tasks (excluding epics) to this project's backlog using the "Add Task" button in the header.</p>
          </div>
        )
      ) : projects.length > 0 ? (
         <div className="flex items-center justify-center h-full">
            <p className="text-xl text-muted-foreground">Please select a project to view its backlog.</p>
        </div>
      ) : null}
    </div>
  );
}
