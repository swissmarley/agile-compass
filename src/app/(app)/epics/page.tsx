
'use client';

import { useMemo } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import type { Task, Project } from '@/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { BACKLOG_STATUS_ID, ALL_TASK_STATUSES, DEFAULT_KANBAN_BOARD_COLUMNS } from '@/config/site';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Helper to convert Timestamp to Date safely
const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
};

export default function EpicsPage() {
  const { appUser } = useAuth();
  const {
    tasks: allTasks,
    selectedProjectId,
    isLoading,
    projects,
    openCreateTaskDialog,
    openViewTaskDialog,
  } = useAppData();

  const canCreateEpic = appUser?.role === 'Administrator' || appUser?.role === 'Manager';
  const canEditEpic = appUser?.role === 'Administrator' || appUser?.role === 'Manager';

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const projectName = selectedProject?.name || "Selected Project";

  const projectEpics = useMemo(() => {
    if (!selectedProjectId) return [];
    return allTasks
      .filter(task => task.projectId === selectedProjectId && task.issueType === 'epic')
      .sort((a, b) => (tsToDate(b.createdAt)?.getTime() ?? 0) - (tsToDate(a.createdAt)?.getTime() ?? 0));
  }, [allTasks, selectedProjectId]);

  const getStatusTitle = (statusId: string, project?: Project): string => {
    const boardColumns = project?.boardColumns || DEFAULT_KANBAN_BOARD_COLUMNS;
    const statusConfig = boardColumns.find(col => col.id === statusId) || ALL_TASK_STATUSES.find(s => s.id === statusId);
    return statusConfig?.title || statusId;
  };

  const handleOpenCreateEpicDialog = () => {
    if (openCreateTaskDialog && selectedProjectId && canCreateEpic) {
      openCreateTaskDialog(BACKLOG_STATUS_ID, undefined, selectedProjectId, 'epic');
    } else if (!selectedProjectId) {
      alert("Please select a project to create an Epic.");
    } else if (!canCreateEpic) {
      alert("You do not have permission to create Epics.");
    }
  };

  const handleViewItem = (item: Task) => {
    if (openViewTaskDialog) {
      openViewTaskDialog(item);
    }
  };

  const handleEditEpic = (epic: Task) => {
    if (openCreateTaskDialog && selectedProjectId && canEditEpic) {
      openCreateTaskDialog(epic.status, epic, epic.projectId, 'epic');
    } else if (!canEditEpic) {
      alert("You do not have permission to edit Epics.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="shadow-lg rounded-xl border">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-1/4" /> <Skeleton className="h-8 w-1/4 ml-2" />
              </CardFooter>
            </Card>
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
        <p className="text-muted-foreground mb-4">Create a project to start organizing Epics.</p>
      </div>
    );
  }

  if (!selectedProjectId && projects.length > 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">Please select a project to view its Epics.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Epics for {projectName}</h1>
        {selectedProjectId && canCreateEpic && (
          <Button onClick={handleOpenCreateEpicDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Icons.IssueEpic className="mr-2 h-5 w-5" /> Create Epic
          </Button>
        )}
      </div>

      {selectedProjectId ? (
        projectEpics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projectEpics.map(epic => {
              const createdAtDate = tsToDate(epic.createdAt);
              const storiesForEpic = allTasks.filter(
                (task) => task.issueType === 'story' && task.epicId === epic.id
              ).sort((a, b) => (tsToDate(a.createdAt)?.getTime() ?? 0) - (tsToDate(b.createdAt)?.getTime() ?? 0));

              let totalDescendantTasks = 0;
              let completedDescendantTasks = 0;
              storiesForEpic.forEach(story => {
                const tasksForStory = allTasks.filter(
                  (taskItem) => taskItem.parentStoryId === story.id && taskItem.issueType !== 'story' && taskItem.issueType !== 'epic'
                );
                totalDescendantTasks += tasksForStory.length;
                completedDescendantTasks += tasksForStory.filter(t => t.status === 'done').length;
              });
              const epicProgress = totalDescendantTasks > 0 ? (completedDescendantTasks / totalDescendantTasks) * 100 : 0;

              return (
                <Card key={epic.id} className="shadow-lg rounded-xl border flex flex-col justify-between">
                  <div>
                    <CardHeader className="cursor-pointer" onClick={() => handleViewItem(epic)}>
                      <div className="flex justify-between items-start">
                          <CardTitle className="text-xl mb-1 flex items-center">
                            <Icons.IssueEpic className="h-5 w-5 mr-2 text-primary" />
                            {epic.title}
                          </CardTitle>
                      </div>
                      {epic.description && (
                        <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {epic.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{epicProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={epicProgress} aria-label={`Epic progress ${epicProgress.toFixed(0)}%`} className="h-2" />
                      </div>
                      
                      {createdAtDate && (
                        <p className="text-xs text-muted-foreground cursor-pointer" onClick={() => handleViewItem(epic)}>
                          Created: {format(createdAtDate, 'MMM dd, yyyy')}
                        </p>
                      )}

                      {storiesForEpic.length > 0 && (
                        <div className="mt-4 pt-3 border-t">
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center">
                            <Icons.IssueStory className="h-4 w-4 mr-1.5 text-accent"/> User Stories ({storiesForEpic.length})
                          </h4>
                          <ul className="space-y-2">
                            {storiesForEpic.map(story => {
                              const tasksForStory = allTasks.filter(
                                (taskItem) => taskItem.parentStoryId === story.id && taskItem.issueType !== 'story' && taskItem.issueType !== 'epic'
                              ).sort((a, b) => (tsToDate(a.createdAt)?.getTime() ?? 0) - (tsToDate(b.createdAt)?.getTime() ?? 0));
                              const StoryIcon = Icons[story.issueType as keyof typeof Icons] || Icons.IssueStory;
                              const storyStatusTitle = getStatusTitle(story.status, selectedProject);

                              return (
                                <li key={story.id} className="ml-2 p-2 rounded-md bg-muted/20 border border-muted/30 shadow-sm">
                                  <div
                                    className="flex items-center justify-between cursor-pointer hover:bg-muted/40 p-1.5 rounded"
                                    onClick={() => handleViewItem(story)}
                                  >
                                    <div className="flex items-center">
                                      <StoryIcon className="h-4 w-4 mr-2 text-accent shrink-0" />
                                      <span className="text-sm font-medium text-foreground">{story.title}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs capitalize">{storyStatusTitle}</Badge>
                                  </div>
                                  {tasksForStory.length > 0 && (
                                    <ul className="mt-1.5 space-y-1 pl-5 border-l border-dashed border-muted/50 ml-2">
                                      {tasksForStory.map(taskItem => {
                                        const TaskIcon = Icons[taskItem.issueType as keyof typeof Icons] || Icons.ListChecks;
                                        const taskStatusTitle = getStatusTitle(taskItem.status, selectedProject);
                                        return (
                                          <li
                                            key={taskItem.id}
                                            className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/50 p-1 rounded relative"
                                            onClick={() => handleViewItem(taskItem)}
                                          >
                                            <div className="flex items-center">
                                               <span className="absolute left-[-0.8rem] top-1/2 -translate-y-1/2 text-muted-foreground">&ndash;</span>
                                              <TaskIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                                              <span className="text-muted-foreground">{taskItem.title}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-xxs capitalize">{taskStatusTitle}</Badge>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                  {tasksForStory.length === 0 && (
                                     <p className="text-xs text-muted-foreground mt-1 pl-7">No tasks assigned to this story.</p>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                       {storiesForEpic.length === 0 && selectedProjectId && (
                          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">No user stories assigned to this epic yet.</p>
                        )}
                    </CardContent>
                  </div>
                  <CardFooter className="p-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => handleViewItem(epic)} className="mr-2">
                      <Icons.View className="mr-2 h-4 w-4" /> View Details
                    </Button>
                    {canEditEpic && (
                      <Button variant="outline" size="sm" onClick={() => handleEditEpic(epic)}>
                        <Icons.Edit className="mr-2 h-4 w-4" /> Edit Epic
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center border border-dashed rounded-lg">
            <Icons.IssueEpic className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Epics Yet</h2>
            <p className="text-muted-foreground">Create your first Epic to group related stories and tasks.</p>
          </div>
        )
      ) : (
         projects.length > 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
                <p className="text-xl text-muted-foreground">Please select a project to manage Epics.</p>
            </div>
        )
      )}
    </div>
  );
}
