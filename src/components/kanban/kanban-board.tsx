// @ts-nocheck
'use client';

import { useState } from 'react'; 
import { KanbanColumn } from './kanban-column';
import type { Task, ProjectBoardColumn } from '@/types'; 
import { useAppData } from '@/contexts/app-data-context'; 
import { BACKLOG_STATUS_ID } from '@/config/site';

interface KanbanBoardProps {
  tasks: Task[]; 
  columns: ProjectBoardColumn[]; 
}

export function KanbanBoard({ tasks: boardTasks, columns }: KanbanBoardProps) { 
  const { updateTask, selectedProjectId, openCreateTaskDialog, openViewTaskDialog, tasks: allTasks } = useAppData(); 

  const handleTaskDrop = (taskId: string, newStatus: string) => { 
    const taskToUpdate = allTasks.find(t => t.id === taskId); 
    if (taskToUpdate) {
      updateTask({ ...taskToUpdate, status: newStatus });
    }
  };

  const handleEditTask = (task: Task) => {
    if (openCreateTaskDialog) {
      openCreateTaskDialog(task.status, task, task.projectId);
    } else {
      console.warn("openCreateTaskDialog function not available on context for editing task.");
    }
  };

  const handleViewTask = (task: Task) => {
    if (openViewTaskDialog) {
      openViewTaskDialog(task);
    } else {
      console.warn("openViewTaskDialog function not available on context for viewing task.");
    }
  };

  const handleOpenAddTaskInColumn = (status: string) => { 
     if (openCreateTaskDialog) {
        if (!selectedProjectId) {
            alert("Please select a project first to add a task to this column.");
            return;
        }
        openCreateTaskDialog(status, undefined, selectedProjectId);
     } else {
        console.warn("openCreateTaskDialog function not available on context for adding task in column.");
     }
  };

  const handleMoveTaskToBacklog = (taskId: string) => {
    const taskToMove = allTasks.find(t => t.id === taskId);
    if (taskToMove) {
      // Pass the original task for accurate notification generation
      updateTask({ ...taskToMove, status: BACKLOG_STATUS_ID }, taskToMove);
    }
  };

  const DndWrapper = ({ children }: { children: React.ReactNode }) => <div className="flex flex-row gap-4 md:gap-6 lg:gap-8 h-full">{children}</div>;
  
  return (
    <div className="flex flex-col h-full">
      <DndWrapper>
        {columns.map(({ id, title }) => (
          <KanbanColumn
            key={id}
            status={id} 
            title={title}
            tasks={boardTasks.filter((task) => task.status === id).sort((a,b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))} 
            onDropTask={handleTaskDrop}
            onEditTask={handleEditTask} 
            onAddTask={handleOpenAddTaskInColumn}
            onViewTask={handleViewTask}
            onMoveToBacklog={handleMoveTaskToBacklog} // Pass handler
          />
        ))}
      </DndWrapper>
    </div>
  );
}