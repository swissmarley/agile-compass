
'use client';

import React, { useMemo } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import type { Task, Sprint, Project } from '@/types';
import {
  format,
  differenceInDays,
  startOfDay,
  addDays,
  min,
  max,
} from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ReferenceLine,
  LabelList,
} from 'recharts';
import { Badge } from '@/components/ui/badge';

const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
};

const GANTT_BAR_HEIGHT = 20;
const GANTT_Y_AXIS_WIDTH = 220;
const GANTT_CHART_PADDING = { top: 20, right: 30, left: 20, bottom: 20 };

const PLANNED_COLOR = '#3B82F6'; // Blue
const ACTIVE_COLOR = '#10B981';   // Green
const COMPLETED_COLOR = '#6B7280'; // Gray
const DEFAULT_GANTT_COLOR = '#D1D5DB'; // Light Gray

const GanttTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const sprintName = data.sprintName;
    const epicName = data.epicName;
    const startDate = tsToDate(data.originalStartDate);
    const endDate = tsToDate(data.originalEndDate);
    const status = data.originalStatus;

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

interface FormattedSprintData {
  id: string;
  sprintName: string;
  epicId: string | null;
  epicName: string | null;
  timeRange: [number, number];
  originalStartDate: Timestamp | Date;
  originalEndDate: Timestamp | Date;
  originalStatus: Sprint['status'];
  yAxisKey?: string;
}

export default function RoadmapPage() {
  const { tasks, sprints, selectedProjectId, isLoading, projects: allProjects, openViewTaskDialog } = useAppData();

  const currentProject = allProjects.find(p => p.id === selectedProjectId);
  const projectName = currentProject?.name || 'Selected Project';

  const ganttChartData = useMemo(() => {
    if (isLoading || !selectedProjectId) return { sprintsByEpicData: [], timelineDomain: [new Date().getTime(), new Date().getTime()], projectEpics: [] };

    const projectSprintsForTimeline = sprints
      .filter(s => s.projectId === selectedProjectId && (s.status === 'active' || s.status === 'planned' || s.status === 'completed') && tsToDate(s.startDate) && tsToDate(s.endDate))
      .sort((a, b) => {
        const epicA = a.epicId || '';
        const epicB = b.epicId || '';
        if (epicA < epicB) return -1;
        if (epicA > epicB) return 1;
        return (tsToDate(a.startDate)?.getTime() ?? 0) - (tsToDate(b.startDate)?.getTime() ?? 0);
      });

    const projectEpics = tasks.filter(t => t.projectId === selectedProjectId && t.issueType === 'epic');
    const epicsById = new Map(projectEpics.map(e => [e.id, e]));

    if (projectSprintsForTimeline.length === 0) {
      return { sprintsByEpicData: [], timelineDomain: [new Date().getTime(), new Date().getTime()], projectEpics: projectEpics };
    }

    const allDates = projectSprintsForTimeline.flatMap(s => [tsToDate(s.startDate), tsToDate(s.endDate)]).filter(Boolean) as Date[];
    let timelineStart = allDates.length > 0 ? startOfDay(min(allDates)) : startOfDay(new Date());
    let timelineEnd = allDates.length > 0 ? startOfDay(max(allDates)) : startOfDay(addDays(new Date(), 30));

    if (timelineEnd <= timelineStart) {
      timelineEnd = addDays(timelineStart, 1);
    }
    timelineStart = addDays(timelineStart, -10);
    timelineEnd = addDays(timelineEnd, 10);

    const formattedSprints: FormattedSprintData[] = projectSprintsForTimeline.map(sprint => {
      const sprintStart = tsToDate(sprint.startDate)!;
      const sprintEnd = tsToDate(sprint.endDate)!;
      const epic = sprint.epicId ? epicsById.get(sprint.epicId) : null;

      return {
        id: sprint.id,
        sprintName: sprint.name,
        epicId: sprint.epicId || null,
        epicName: epic ? epic.title : null,
        timeRange: [sprintStart.getTime(), sprintEnd.getTime()],
        originalStartDate: sprint.startDate,
        originalEndDate: sprint.endDate,
        originalStatus: sprint.status,
      };
    });

    const sprintsByEpic: { epic: Task | null; sprints: FormattedSprintData[] }[] = [];
    const epicsWithSprints = new Set<string>();

    projectEpics.forEach(epic => {
      const sprintsForEpic = formattedSprints.filter(s => s.epicId === epic.id);
      if (sprintsForEpic.length > 0) {
        sprintsByEpic.push({ epic, sprints: sprintsForEpic.sort((a, b) => (tsToDate(a.originalStartDate)?.getTime() ?? 0) - (tsToDate(b.originalStartDate)?.getTime() ?? 0)) });
        epicsWithSprints.add(epic.id);
      }
    });

    const sprintsWithoutEpic = formattedSprints.filter(s => !s.epicId).sort((a, b) => (tsToDate(a.originalStartDate)?.getTime() ?? 0) - (tsToDate(b.originalStartDate)?.getTime() ?? 0));
    if (sprintsWithoutEpic.length > 0) {
      sprintsByEpic.push({ epic: null, sprints: sprintsWithoutEpic });
    }
    sprintsByEpic.sort((a, b) => {
      if (a.epic && b.epic) return a.epic.title.localeCompare(b.epic.title);
      if (a.epic) return -1;
      if (b.epic) return 1;
      return 0;
    });

    return {
      sprintsByEpicData: sprintsByEpic, // Correctly assign sprintsByEpic to sprintsByEpicData
      timelineDomain: [timelineStart.getTime(), timelineEnd.getTime()],
      projectEpics: projectEpics // Correctly assign local projectEpics to projectEpics key
    };
  }, [sprints, tasks, selectedProjectId, isLoading]);

  const flattenedChartData = useMemo(() => {
    if (!ganttChartData.sprintsByEpicData) return [];
    return ganttChartData.sprintsByEpicData.flatMap((group) =>
      group.sprints.map(sprint => ({
        ...sprint,
        yAxisKey: `${group.epic?.title || "General Sprints"} - ${sprint.sprintName}`
      }))
    );
  }, [ganttChartData.sprintsByEpicData]);

  const handleViewTask = (task: Task) => {
    if (openViewTaskDialog) {
      openViewTaskDialog(task);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6 h-full">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (allProjects.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Icons.Project className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Projects Yet</h2>
        <p className="text-muted-foreground mb-4">Create a project to start planning your roadmap.</p>
      </div>
    );
  }

  if (!selectedProjectId && allProjects.length > 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">Please select a project to view its roadmap.</p>
      </div>
    );
  }

  const { sprintsByEpicData, timelineDomain, projectEpics: epicsForList } = ganttChartData;
  const totalSprintsInChart = flattenedChartData.length;

  if (totalSprintsInChart === 0 && selectedProjectId && !isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Roadmap for {projectName}</h1>
        <div className="flex flex-col items-center justify-center flex-grow p-8 text-center">
          <Icons.Roadmap className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Sprints for Roadmap</h2>
          <p className="text-muted-foreground">Create active or planned sprints with valid dates in this project to see them on the roadmap timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Roadmap Timeline for {projectName}</h1>

      {totalSprintsInChart > 0 ? (
        <Card className="shadow-lg rounded-lg flex-grow flex flex-col min-h-[400px]">
          <CardHeader>
            <CardTitle>Epic & Sprint Gantt Chart</CardTitle>
            <CardDescription>Timeline of project sprints, grouped by Epic, showing their duration, status, and current date context.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-x-auto">
            <ResponsiveContainer width="100%" height={Math.max(400, flattenedChartData.length * (GANTT_BAR_HEIGHT + 25) + GANTT_CHART_PADDING.top + GANTT_CHART_PADDING.bottom + 40 )}>
              <BarChart
                data={flattenedChartData}
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
                <YAxis
                  type="category"
                  dataKey="yAxisKey"
                  width={GANTT_Y_AXIS_WIDTH}
                  tickFormatter={(value: string) => {
                    const parts = value.split(" - ");
                    return parts.length > 1 ? parts[1] : value;
                  }}
                  tick={{ fontSize: 10 }}
                  interval={0}
                />
                <Tooltip content={<GanttTooltip />} cursor={{fill: 'hsl(var(--muted))'}} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} payload={[
                    { value: 'Planned', type: 'square', color: PLANNED_COLOR, id: 'planned' },
                    { value: 'Active', type: 'square', color: ACTIVE_COLOR, id: 'active' },
                    { value: 'Completed', type: 'square', color: COMPLETED_COLOR, id: 'completed' },
                ]}/>
                <ReferenceLine
                  x={new Date().getTime()}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                  label={{
                    value: "Today",
                    position: "insideBottomRight",
                    fill: "hsl(var(--destructive))",
                    fontSize: 10,
                    dy: 10
                  }}
                />
                <Bar dataKey="timeRange" barSize={GANTT_BAR_HEIGHT} isAnimationActive={false} radius={4}>
                  {flattenedChartData.map((entry, index) => {
                    let fillColor = DEFAULT_GANTT_COLOR;
                    if (entry.originalStatus === 'planned') fillColor = PLANNED_COLOR;
                    else if (entry.originalStatus === 'active') fillColor = ACTIVE_COLOR;
                    else if (entry.originalStatus === 'completed') fillColor = COMPLETED_COLOR;
                    return <Cell key={`cell-${entry.id}-${index}`} fill={fillColor} />;
                  })}
                  <LabelList
                    dataKey="sprintName"
                    position="right"
                    offset={5}
                    fontSize={10}
                    formatter={(value: string) => value.length > 20 ? value.substring(0,17) + "..." : value } />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
         selectedProjectId && !isLoading && (
            <div className="flex flex-col items-center justify-center flex-grow p-8 text-center">
                <Icons.Roadmap className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No Sprints to Display</h2>
                <p className="text-muted-foreground">This project has no active, planned, or completed sprints with valid dates to display on the roadmap timeline.</p>
            </div>
        )
      )}

      {totalSprintsInChart > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Tasks by Sprint</h2>
           <ScrollArea className="h-[calc(100vh-var(--header-height,4rem)-450px)] md:h-[300px]">
            {sprintsByEpicData.map(epicGroup => (
              <div key={epicGroup.epic?.id || 'no-epic-group'} className="mb-4">
                <h3 className="text-lg font-medium mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1 z-10">
                  {epicGroup.epic ? (
                    <span className="flex items-center"><Icons.IssueEpic className="mr-2 h-5 w-5 text-primary" /> {epicGroup.epic.title}</span>
                  ) : (
                    <span className="flex items-center"><Icons.Sprint className="mr-2 h-5 w-5 text-muted-foreground" /> General Sprints</span>
                  )}
                </h3>
                {epicGroup.sprints.map(sprint => {
                  const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
                  const originalSprint = sprints.find(s => s.id === sprint.id);
                  return (
                    <Card key={sprint.id} className="mb-3 shadow-sm ml-2">
                      <CardHeader className="py-2 px-3 border-b">
                        <CardTitle className="text-sm font-semibold">{sprint.sprintName} <Badge variant="outline" className="ml-2 capitalize text-xs">{sprint.originalStatus}</Badge></CardTitle>
                        <CardDescription className="text-xs">
                            {tsToDate(sprint.originalStartDate) ? format(tsToDate(sprint.originalStartDate)!, 'MMM dd') : 'N/A'} - {tsToDate(sprint.originalEndDate) ? format(tsToDate(sprint.originalEndDate)!, 'MMM dd, yyyy') : 'N/A'}
                            {originalSprint?.goal && <span className="block italic text-xxs mt-0.5">Goal: {originalSprint.goal}</span>}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-2">
                        {sprintTasks.length > 0 ? (
                          <ul className="space-y-1">
                            {sprintTasks.map(task => {
                              const IssueIcon = Icons[task.issueType as keyof typeof Icons] || Icons.ListChecks;
                              return (
                                <li key={task.id}
                                    className="text-xs flex items-center justify-between p-1 rounded hover:bg-muted/50 cursor-pointer"
                                    onClick={() => handleViewTask(task)}
                                >
                                  <div className="flex items-center min-w-0">
                                    <IssueIcon className="h-3 w-3 mr-1 shrink-0 text-muted-foreground" />
                                    <span className="truncate flex-grow" title={task.title}>{task.title}</span>
                                  </div>
                                  {task.dueDate && <Badge variant="outline" className="text-xxs whitespace-nowrap ml-1 text-[10px] p-0.5 px-1">Due: {format(tsToDate(task.dueDate)!, 'MMM dd')}</Badge>}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">No tasks in this sprint.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
