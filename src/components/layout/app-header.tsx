
'use client';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Project } from '@/types';
import { ThemeToggleButton } from './theme-toggle-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppData } from '@/contexts/app-data-context';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

interface AppHeaderProps {
  projects: Project[];
  selectedProjectId?: string | null;
  onProjectChange: (projectId: string) => void;
  onAddTask: () => void;
  onAddProject: () => void;
  onToggleNotifications: () => void;
}

export function AppHeader({
  projects,
  selectedProjectId,
  onProjectChange,
  onAddTask,
  onAddProject,
  onToggleNotifications,
}: AppHeaderProps) {
  const { appUser } = useAuth(); // Get appUser for role checks
  const { notifications } = useAppData();
  const currentProjectName = selectedProjectId && projects.length > 0
    ? projects.find(p => p.id === selectedProjectId)?.name
    : null;

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
  const canCreateProject = appUser?.role === 'Administrator' || appUser?.role === 'Manager';
  const canAddTask = appUser?.role === 'Administrator' || appUser?.role === 'Manager' || appUser?.role === 'Supervisor';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
      <SidebarTrigger className="md:hidden" />
      <div className="flex items-center gap-2">
        <Icons.Project className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold text-foreground truncate max-w-xs md:max-w-sm lg:max-w-md">
          {currentProjectName || (projects.length > 0 ? 'Select a Project' : 'No Projects Available')}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-4">
        {projects.length > 0 ? (
          <Select value={selectedProjectId || ""} onValueChange={onProjectChange}>
            <SelectTrigger className="w-[150px] md:w-[200px] text-sm h-9">
              <SelectValue placeholder="Switch project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Skeleton className="h-9 w-[150px] md:w-[200px] hidden sm:inline-flex" />
        )}

        {canCreateProject && (
          <>
            <Button onClick={onAddProject} variant="outline" size="sm" className="hidden sm:inline-flex">
              <Icons.AddProject className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">New Project</span>
            </Button>
            <Button onClick={onAddProject} variant="outline" size="icon" className="sm:hidden">
              <Icons.AddProject className="h-5 w-5" />
              <span className="sr-only">New Project</span>
            </Button>
          </>
        )}

        {canAddTask && (
          <>
            <Button
              onClick={onAddTask}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hidden sm:inline-flex"
              size="sm"
              disabled={projects.length === 0 || !selectedProjectId}
            >
              <Icons.Add className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
              <span>Add Task</span>
            </Button>
            <Button
                onClick={onAddTask}
                variant="default"
                size="icon"
                className="sm:hidden bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={projects.length === 0 || !selectedProjectId}
              >
              <Icons.Add className="h-5 w-5" />
              <span className="sr-only">Add Task</span>
            </Button>
          </>
        )}

        <Button onClick={onToggleNotifications} variant="outline" size="icon" className="relative">
          <Icons.Bell className="h-5 w-5" />
          {unreadNotificationsCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 min-w-fit p-0.5 text-xs flex items-center justify-center rounded-full"
            >
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>

        <ThemeToggleButton />
      </div>
    </header>
  );
}
