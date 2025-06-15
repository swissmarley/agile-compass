
'use client';

import { KanbanBoard } from '@/components/kanban/kanban-board';
import { useAppData } from '@/contexts/app-data-context';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_KANBAN_BOARD_COLUMNS } from '@/config/site'; // Import default columns
import type { ProjectBoardColumn, Task } from '@/types';

export default function DashboardPage() {
  const { tasks, selectedProjectId, isLoading, projects } = useAppData();

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 h-full">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8 h-full">
            {[1, 2, 3].map(i => ( // Render 3 skeletons to match default columns
              <div key={i} className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[340px] min-h-[300px] bg-secondary/50 rounded-lg shadow-sm p-4">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-24 w-full mb-3" />
                <Skeleton className="h-20 w-full mb-3" />
              </div>
            ))}
          </div>
      </div>
    );
  }

  if (projects.length === 0 && !isLoading) {
     return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Icons.Project className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Projects Yet</h2>
            <p className="text-muted-foreground mb-4">Create a project to start organizing your tasks.</p>
        </div>
    );
  }

   if (!selectedProjectId && projects.length > 0 && !isLoading) {
    return (
        <div className="flex items-center justify-center h-full p-8">
            <p className="text-xl text-muted-foreground">Please select a project to view tasks.</p>
        </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const columnsToRender: ProjectBoardColumn[] = 
    selectedProject?.boardColumns && selectedProject.boardColumns.length > 0
      ? selectedProject.boardColumns
      : DEFAULT_KANBAN_BOARD_COLUMNS;

  const boardValidStatuses = columnsToRender.map(col => col.id);
  
  const filteredTasks = selectedProjectId
    ? tasks.filter(task => 
        task.projectId === selectedProjectId && 
        boardValidStatuses.includes(task.status) &&
        task.issueType !== 'epic' // Exclude epics
      )
    : [];

  return (
     <div className="p-4 md:p-6 lg:p-8 h-full overflow-x-auto"> {/* Added overflow-x-auto */}
      {selectedProjectId ? (
        <KanbanBoard
            tasks={filteredTasks}
            columns={columnsToRender} // Pass dynamic columns
        />
         ) : projects.length > 0 ? (
            <div className="flex items-center justify-center h-full">
                <p className="text-xl text-muted-foreground">Please select a project to view tasks.</p>
            </div>
        ) : null 
        }
    </div>
  );
}
