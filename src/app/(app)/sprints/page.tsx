
'use client';

import { useState, useMemo } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import type { Sprint, Task, SprintStatus, Project, ProjectBoardColumn } from '@/types';
import { format, differenceInDays, isPast, isFuture, isToday, startOfDay, addDays, min, max } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { ALL_TASK_STATUSES, DEFAULT_KANBAN_BOARD_COLUMNS } from '@/config/site';

// Helper to convert Timestamp to Date safely
const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
};

const GANTT_BAR_HEIGHT = 20;
const GANTT_Y_AXIS_WIDTH = 150;
const GANTT_CHART_PADDING = { top: 20, right: 30, left: 20, bottom: 5 };

const PLANNED_COLOR = '#3B82F6'; // Blue
const ACTIVE_COLOR = '#10B981';   // Green
const COMPLETED_COLOR = '#6B7280'; // Gray
const DEFAULT_GANTT_COLOR = '#D1D5DB'; // Light Gray

// Custom Tooltip for Sprint Gantt Chart
const SprintGanttTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const sprintName = label;
    const startDate = tsToDate(data.originalStartDate);
    const endDate = tsToDate(data.originalEndDate);
    const status = data.originalStatus;
    const epicName = data.epicName;


    return (
      <div className="bg-popover text-popover-foreground p-3 rounded-md shadow-lg border text-xs">
        {epicName && <p className="font-semibold text-primary">Epic: {epicName}</p>}
        <p className="font-semibold">{sprintName}</p>
        {startDate && endDate && (
          <p>
            {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd, yyyy')}
          </p>
        )}
        <p>Status: <span className="capitalize">{status}</span></p>
        {startDate && endDate && (
           <p>Duration: {differenceInDays(endDate, startDate) + 1} days</p>
        )}
      </div>
    );
  }
  return null;
};


export default function SprintsPage() {
  const { appUser } = useAuth();
  const {
    sprints,
    tasks: allTasks, 
    selectedProjectId,
    isLoading,
    projects,
    openCreateSprintDialog, // This will now handle both create and edit
    updateSprint,
    openSprintRetrospectiveDialog,
    openViewTaskDialog, 
  } = useAppData();

  const canManageSprints = appUser?.role === 'Administrator' || appUser?.role === 'Manager' || appUser?.role === 'Supervisor';

  const currentProject = projects.find(p => p.id === selectedProjectId);
  const projectName = currentProject?.name || "Selected Project";

  const projectEpics = useMemo(() => {
    if (!selectedProjectId) return [];
    return allTasks.filter(task => task.projectId === selectedProjectId && task.issueType === 'epic');
  }, [allTasks, selectedProjectId]);
  const epicsById = useMemo(() => new Map(projectEpics.map(e => [e.id, e])), [projectEpics]);


  const projectSprintsForList = useMemo(() => {
    if (!selectedProjectId) return [];
    return sprints
      .filter(sprint => sprint.projectId === selectedProjectId)
      .sort((a, b) => (tsToDate(b.createdAt)?.getTime() ?? 0) - (tsToDate(a.createdAt)?.getTime() ?? 0));
  }, [sprints, selectedProjectId]);

  const sprintGanttChartData = useMemo(() => {
    if (isLoading || !selectedProjectId) return { chartData: [], timelineDomain: [new Date().getTime(), new Date().getTime()], validSprintsForChart: [] };

    const validSprintsForChart = projectSprintsForList
      .filter(s => tsToDate(s.startDate) && tsToDate(s.endDate))
      .sort((a, b) => (tsToDate(a.startDate)?.getTime() ?? 0) - (tsToDate(b.startDate)?.getTime() ?? 0));

    if (validSprintsForChart.length === 0) {
      return { chartData: [], timelineDomain: [new Date().getTime(), new Date().getTime()], validSprintsForChart: [] };
    }

    const allDates = validSprintsForChart.flatMap(s => [tsToDate(s.startDate), tsToDate(s.endDate)]).filter(Boolean) as Date[];
    let timelineStart = allDates.length > 0 ? startOfDay(min(allDates)) : startOfDay(new Date());
    let timelineEnd = allDates.length > 0 ? startOfDay(max(allDates)) : startOfDay(addDays(new Date(), 30));

    if (timelineEnd <= timelineStart) {
      timelineEnd = addDays(timelineStart, 1);
    }
    timelineStart = addDays(timelineStart, -2);
    timelineEnd = addDays(timelineEnd, 2);

    const chartData = validSprintsForChart.map(sprint => {
      const sprintStart = tsToDate(sprint.startDate)!;
      const sprintEnd = tsToDate(sprint.endDate)!;
      const epic = sprint.epicId ? epicsById.get(sprint.epicId) : null;

      return {
        name: sprint.name,
        timeRange: [sprintStart.getTime(), sprintEnd.getTime()],
        originalStartDate: sprint.startDate,
        originalEndDate: sprint.endDate,
        originalStatus: sprint.status,
        epicName: epic ? epic.title : null,
        id: sprint.id,
      };
    });

    return { chartData, timelineDomain: [timelineStart.getTime(), timelineEnd.getTime()], validSprintsForChart };
  }, [projectSprintsForList, selectedProjectId, isLoading, epicsById]);


  const getSprintTasks = (sprintId: string): Task[] => {
    return allTasks.filter(task => task.sprintId === sprintId);
  };

  const handleStartSprint = async (sprint: Sprint) => {
    if (!canManageSprints) return;
    if (sprint.status === 'planned') {
      const hasActiveSprint = projectSprintsForList.some(s => s.status === 'active' && s.id !== sprint.id);
      if (hasActiveSprint) {
        alert("Another sprint is already active. Please complete or plan it before starting a new one.");
        return;
      }
      try {
        // Pass the original sprint for notification comparison
        const originalSprint = sprints.find(s => s.id === sprint.id);
        await updateSprint({ ...sprint, status: 'active' }, originalSprint);
      } catch (error) {
        console.error("Failed to start sprint:", error);
      }
    }
  };

  const handleCompleteSprint = async (sprint: Sprint) => {
    if (!canManageSprints) return;
    if (sprint.status === 'active') {
      const completedSprint = { ...sprint, status: 'completed' as SprintStatus };
      try {
        const originalSprint = sprints.find(s => s.id === sprint.id);
        await updateSprint(completedSprint, originalSprint);
        if (openSprintRetrospectiveDialog) {
          openSprintRetrospectiveDialog(completedSprint);
        }
      } catch (error) {
         console.error("Failed to complete sprint:", error);
      }
    }
  };

  const handleOpenEditSprintDialog = (sprint: Sprint) => {
    if (openCreateSprintDialog && canManageSprints) {
        openCreateSprintDialog(sprint.projectId, sprint); // Pass sprint to edit
    }
  };

  const handleViewItem = (item: Task) => {
    if (openViewTaskDialog) {
      openViewTaskDialog(item);
    }
  };

  const getStatusTitle = (statusId: string, project?: Project): string => {
    const boardColumns = project?.boardColumns || DEFAULT_KANBAN_BOARD_COLUMNS;
    const statusConfig = boardColumns.find(col => col.id === statusId) || ALL_TASK_STATUSES.find(s => s.id === statusId);
    return statusConfig?.title || statusId;
  };


  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-[200px] w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
              <CardFooter><Skeleton className="h-8 w-1/3" /></CardFooter>
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
        <p className="text-muted-foreground mb-4">Create a project to start planning sprints.</p>
      </div>
    );
  }

  if (!selectedProjectId && projects.length > 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">Please select a project to view its sprints.</p>
      </div>
    );
  }

  const { chartData: ganttSprintsData, timelineDomain, validSprintsForChart } = sprintGanttChartData;


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Sprints for {projectName}</h1>
        {selectedProjectId && openCreateSprintDialog && canManageSprints && (
          <Button onClick={() => openCreateSprintDialog(selectedProjectId, null)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Icons.Add className="mr-2 h-5 w-5" /> Create Sprint
          </Button>
        )}
      </div>

      {selectedProjectId && validSprintsForChart.length > 0 && (
        <Card className="shadow-lg rounded-lg mb-8">
          <CardHeader>
            <CardTitle>Sprint Timeline</CardTitle>
            <CardDescription>Visual overview of sprint durations and statuses for {projectName}.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
             <ResponsiveContainer width="100%" height={validSprintsForChart.length * (GANTT_BAR_HEIGHT + 20) + GANTT_CHART_PADDING.top + GANTT_CHART_PADDING.bottom + 40}>
              <BarChart
                data={ganttSprintsData}
                layout="vertical"
                margin={GANTT_CHART_PADDING}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
                <XAxis
                  type="number"
                  domain={timelineDomain}
                  tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')}
                  scale="time"
                  allowDataOverflow={true}
                />
                <YAxis type="category" dataKey="name" width={GANTT_Y_AXIS_WIDTH} tick={{ fontSize: 12 }} interval={0} />
                <Tooltip content={<SprintGanttTooltip />} cursor={{fill: 'hsl(var(--muted))'}} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} payload={[
                    { value: 'Planned', type: 'square', color: PLANNED_COLOR, id: 'planned' },
                    { value: 'Active', type: 'square', color: ACTIVE_COLOR, id: 'active' },
                    { value: 'Completed', type: 'square', color: COMPLETED_COLOR, id: 'completed' },
                ]}/>
                <Bar dataKey="timeRange" barSize={GANTT_BAR_HEIGHT} legendType="none" isAnimationActive={false} radius={4}>
                  {ganttSprintsData.map((entry, index) => {
                    let fillColor = DEFAULT_GANTT_COLOR;
                    if (entry.originalStatus === 'planned') fillColor = PLANNED_COLOR;
                    if (entry.originalStatus === 'active') fillColor = ACTIVE_COLOR;
                    if (entry.originalStatus === 'completed') fillColor = COMPLETED_COLOR;
                    return <Cell key={`cell-sprint-gantt-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}


      {selectedProjectId ? (
        projectSprintsForList.length > 0 ? (
          <div className="space-y-6">
            {projectSprintsForList.map(sprint => {
              const sprintTasks = getSprintTasks(sprint.id);
              const completedTasksCount = sprintTasks.filter(t => t.status === 'done').length;
              const totalTasksCount = sprintTasks.length;
              const progress = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

              const startDate = tsToDate(sprint.startDate);
              const endDate = tsToDate(sprint.endDate);
              const now = new Date();
              const daysRemaining = endDate ? differenceInDays(endDate, now) : Infinity;
              const epicForSprint = sprint.epicId ? epicsById.get(sprint.epicId) : null;


              let statusBadgeVariant: "default" | "secondary" | "outline" | "destructive" = "secondary";
              if (sprint.status === 'active') statusBadgeVariant = 'default';
              else if (sprint.status === 'completed') statusBadgeVariant = 'outline';
              else if (sprint.status === 'planned') statusBadgeVariant = 'secondary';

              const storiesInSprint = sprintTasks.filter(task => task.issueType === 'story');
              const tasksNotInStoriesInSprint = sprintTasks.filter(task => task.issueType !== 'story' && task.issueType !== 'epic' && !task.parentStoryId);

              return (
                <Card key={sprint.id} className="shadow-lg rounded-xl border">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl mb-1">{sprint.name}</CardTitle>
                            <CardDescription className="text-sm">
                            {startDate ? format(startDate, 'MMM dd, yyyy') : 'N/A'} - {endDate ? format(endDate, 'MMM dd, yyyy') : 'N/A'}
                            </CardDescription>
                            {epicForSprint && (
                                <Badge variant="outline" className="mt-1 text-xs flex items-center w-fit">
                                    <Icons.IssueEpic className="mr-1 h-3 w-3 text-primary" />
                                    Parent Epic: {epicForSprint.title}
                                </Badge>
                            )}
                        </div>
                        <Badge variant={statusBadgeVariant} className={cn("capitalize text-sm", sprint.status === 'active' && "bg-accent text-accent-foreground")}>
                            {sprint.status}
                        </Badge>
                    </div>
                    {sprint.goal && <p className="text-sm text-muted-foreground mt-2 italic">"{sprint.goal}"</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress ({completedTasksCount}/{totalTasksCount} tasks)</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} aria-label={`${progress.toFixed(0)}% complete`} className="h-2" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sprint.status === 'active' && endDate && (
                        isPast(endDate) ?
                        <span className="text-destructive">Ended {Math.abs(daysRemaining)} days ago</span> :
                        <span>{daysRemaining} days remaining</span>
                      )}
                      {sprint.status === 'planned' && startDate && isFuture(startDate) && (
                        <span>Starts in {differenceInDays(startDate, now)} days</span>
                      )}
                       {sprint.status === 'planned' && startDate && isToday(startDate) && (
                        <span className="text-primary">Starts today!</span>
                      )}
                    </div>

                    {(storiesInSprint.length > 0 || tasksNotInStoriesInSprint.length > 0) && (
                      <div className="mt-4 pt-3 border-t">
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Sprint Items:</h4>
                        {storiesInSprint.map(story => {
                          const childTasksOfStoryInSprint = sprintTasks.filter(
                            (taskItem) => taskItem.parentStoryId === story.id && taskItem.issueType !== 'story' && taskItem.issueType !== 'epic'
                          );
                          const StoryIcon = Icons[story.issueType as keyof typeof Icons] || Icons.IssueStory;
                          const storyStatusTitle = getStatusTitle(story.status, currentProject);
                          const storyParentEpic = story.epicId ? epicsById.get(story.epicId) : null;

                          return (
                            <div key={story.id} className="ml-2 mb-2 p-2 rounded-md bg-muted/20 border border-muted/30 shadow-sm">
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
                               {storyParentEpic && (
                                <div className="text-xs text-muted-foreground mt-0.5 pl-6 flex items-center">
                                  <Icons.IssueEpic className="h-3 w-3 mr-1 text-primary/70" /> Parent Epic: {storyParentEpic.title}
                                </div>
                              )}
                              {childTasksOfStoryInSprint.length > 0 && (
                                <ul className="mt-1.5 space-y-1 pl-5 border-l border-dashed border-muted/50 ml-2">
                                  {childTasksOfStoryInSprint.map(taskItem => {
                                    const TaskIcon = Icons[taskItem.issueType as keyof typeof Icons] || Icons.ListChecks;
                                    const taskStatusTitle = getStatusTitle(taskItem.status, currentProject);
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
                               {childTasksOfStoryInSprint.length === 0 && (
                                 <p className="text-xs text-muted-foreground mt-1 pl-7">No tasks assigned to this story in this sprint.</p>
                              )}
                            </div>
                          );
                        })}
                        {tasksNotInStoriesInSprint.length > 0 && (
                           <div className="mt-2 ml-2">
                             {storiesInSprint.length > 0 && <p className="text-xs font-medium text-muted-foreground mb-1 pt-2 border-t border-dashed">Other tasks in sprint:</p> }
                            <ul className="space-y-1">
                            {tasksNotInStoriesInSprint.map(taskItem => {
                                const TaskIcon = Icons[taskItem.issueType as keyof typeof Icons] || Icons.ListChecks;
                                const taskStatusTitle = getStatusTitle(taskItem.status, currentProject);
                                return(
                                    <li
                                        key={taskItem.id}
                                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/50 p-1.5 rounded border border-muted/30 shadow-sm"
                                        onClick={() => handleViewItem(taskItem)}
                                    >
                                    <div className="flex items-center">
                                        <TaskIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                                        <span className="text-muted-foreground">{taskItem.title}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xxs capitalize">{taskStatusTitle}</Badge>
                                    </li>
                                );
                            })}
                            </ul>
                           </div>
                        )}
                      </div>
                    )}
                    {sprintTasks.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">No items in this sprint yet.</p>
                    )}


                    {sprint.status === 'completed' && sprint.retrospectiveNotes && (
                        <div className="mt-4 p-3 bg-muted/30 rounded-md border">
                            <h4 className="text-xs font-semibold mb-1 text-foreground flex items-center">
                                <Icons.Info className="h-3 w-3 mr-1.5" /> Retrospective Notes:
                            </h4>
                            <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">
                                {sprint.retrospectiveNotes}
                            </p>
                            {sprint.retrospectiveNotes.split('\n').length > 3 && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-xs p-0 h-auto mt-1"
                                    onClick={() => openSprintRetrospectiveDialog && openSprintRetrospectiveDialog(sprint)}
                                >
                                    View Full Retrospective
                                </Button>
                            )}
                        </div>
                    )}
                  </CardContent>
                  {canManageSprints && (
                    <CardFooter className="flex justify-end gap-2">
                        {(sprint.status === 'planned' || sprint.status === 'active') && (
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditSprintDialog(sprint)}>
                                <Icons.Edit className="mr-2 h-4 w-4" /> Edit Sprint
                            </Button>
                        )}
                        {sprint.status === 'planned' && (
                        <Button variant="outline" size="sm" onClick={() => handleStartSprint(sprint)}>
                            <Icons.Sprint className="mr-2 h-4 w-4" /> Start Sprint
                        </Button>
                        )}
                        {sprint.status === 'active' && (
                        <Button variant="default" size="sm" onClick={() => handleCompleteSprint(sprint)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                            <Icons.Success className="mr-2 h-4 w-4" /> Complete Sprint
                        </Button>
                        )}
                        {sprint.status === 'completed' && openSprintRetrospectiveDialog && (
                            <Button variant="outline" size="sm" onClick={() => openSprintRetrospectiveDialog(sprint)}>
                                <Icons.Edit className="mr-2 h-4 w-4" /> View/Edit Retrospective
                            </Button>
                        )}
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center border border-dashed rounded-lg">
            <Icons.Sprint className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Sprints Yet</h2>
            <p className="text-muted-foreground">Create your first sprint to start organizing work cycles.</p>
            {validSprintsForChart.length > 0 && ganttSprintsData.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">(Ensure sprints have valid start and end dates to appear on the timeline.)</p>
            )}
          </div>
        )
      ) : (
         projects.length > 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
                <p className="text-xl text-muted-foreground">Please select a project to manage sprints.</p>
            </div>
        )
      )}
    </div>
  );
}
