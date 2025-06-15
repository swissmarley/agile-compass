
'use client';

import { useAppData } from '@/contexts/app-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { DEFAULT_KANBAN_BOARD_COLUMNS, BACKLOG_STATUS_ID, ALL_TASK_STATUSES } from '@/config/site'; // Ensured correct import
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import type { Task, Sprint, User, Team, ProjectBoardColumn } from '@/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Timestamp } from 'firebase/firestore'; 


const STATUS_COLORS: { [key: string]: string } = {
  todo: 'hsl(var(--chart-1))',
  inprogress: 'hsl(var(--chart-2))',
  done: 'hsl(var(--chart-3))',
  backlog: 'hsl(var(--chart-4))',
  // Add more colors if custom statuses are expected and need specific colors
};

const BASE_USER_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const BASE_TEAM_COLORS = [
  'hsl(var(--chart-5))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-2))',
];


const generateColorPalette = (baseColors: string[], count: number): string[] => {
  const palette: string[] = [];
  for (let i = 0; i < count; i++) {
    palette.push(baseColors[i % baseColors.length]);
  }
  return palette;
};


const generateTaskStatusChartData = (tasksForChart: Task[], availableStatuses: {id: string, title: string}[]) => {
  return availableStatuses.map((statusConfig, index) => ({
    name: statusConfig.title,
    value: tasksForChart.filter(task => task.status === statusConfig.id).length,
    fill: STATUS_COLORS[statusConfig.id] || BASE_USER_COLORS[index % BASE_USER_COLORS.length], // Fallback color
  })).filter(data => data.value > 0);
};

// Helper to convert Timestamp to Date safely
const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

export default function ReportsPage() {
  // isLoading reflects Firestore loading state
  const { tasks, users, sprints, teams, selectedProjectId, isLoading, projects } = useAppData();

  const USER_COLORS = generateColorPalette(BASE_USER_COLORS, users.length);
  const TEAM_COLORS = generateColorPalette(BASE_TEAM_COLORS, teams.length);


  // Use the isLoading flag from the context
  if (isLoading) {
     return (
      <div className="p-4 md:p-6 lg:p-8 grid gap-6 grid-cols-1 lg:grid-cols-2">
        {[1,2,3,4,5,6].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="h-[300px]">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Remaining logic checks data *after* loading

  if (projects.length === 0 && !isLoading) {
     return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Icons.Project className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Projects Available</h2>
            <p className="text-muted-foreground mb-4">Create or select a project to view reports.</p>
        </div>
    );
  }

  if (!selectedProjectId && projects.length > 0 && !isLoading) {
    return (
        <div className="flex items-center justify-center h-full p-8">
            <p className="text-xl text-muted-foreground">Please select a project to view its reports.</p>
        </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectName = selectedProject?.name || "Selected Project";
  
  const projectSpecificBoardColumns: ProjectBoardColumn[] = 
    selectedProject?.boardColumns && selectedProject.boardColumns.length > 0
      ? selectedProject.boardColumns
      : DEFAULT_KANBAN_BOARD_COLUMNS;

  const allProjectTasks = selectedProjectId
    ? tasks.filter(task => task.projectId === selectedProjectId)
    : [];

  const boardValidStatuses = projectSpecificBoardColumns.map(col => col.id);
  const boardProjectTasks = allProjectTasks.filter(task => boardValidStatuses.includes(task.status));

  const openProjectTasks = allProjectTasks.filter(task => task.status === 'todo' || task.status === 'inprogress');


  const projectSprints = selectedProjectId
    ? sprints.filter(sprint => sprint.projectId === selectedProjectId && (sprint.status === 'active' || sprint.status === 'completed'))
              .sort((a,b) => (tsToDate(b.endDate)?.getTime() ?? 0) - (tsToDate(a.endDate)?.getTime() ?? 0)) // Sort by Date
    : [];

  const backlogProjectTasks = allProjectTasks.filter(task => task.status === BACKLOG_STATUS_ID);


  if (allProjectTasks.length === 0 && selectedProjectId && !isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Icons.Reports className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Data for Reports</h2>
        <p className="text-muted-foreground">There are no tasks or users for the selected project to generate reports.</p>
      </div>
    );
  }

  const tasksByBoardStatusData = generateTaskStatusChartData(boardProjectTasks, projectSpecificBoardColumns);
  const chartConfigBoardStatus = tasksByBoardStatusData.reduce((acc, cur) => {
    acc[cur.name] = { label: cur.name, color: cur.fill };
    return acc;
  }, {} as any);

  const tasksByUserData = users.map((user, index) => ({
    name: user.name,
    tasks: boardProjectTasks.filter(task => task.assignedUserIds?.includes(user.id)).length,
    fill: USER_COLORS[index % USER_COLORS.length],
  })).filter(data => data.tasks > 0);
  const chartConfigUserTasks = tasksByUserData.reduce((acc, cur) => {
    acc[cur.name] = { label: cur.name, color: cur.fill };
    return acc;
  }, {} as any);

  const storyPointsByUserData = users.map((user, index) => ({
    name: user.name,
    storyPoints: boardProjectTasks
      .filter(task => task.assignedUserIds?.includes(user.id))
      .reduce((sum, task) => sum + (task.storyPoints || 0), 0),
    fill: USER_COLORS[index % USER_COLORS.length],
  })).filter(data => data.storyPoints > 0);
  const chartConfigStoryPointsUser = storyPointsByUserData.reduce((acc, cur) => {
    acc[cur.name] = { label: cur.name, color: cur.fill };
    return acc;
  }, {} as any);

  const tasksByTeamData = teams.map((team, index) => {
    return {
      name: team.name,
      tasks: boardProjectTasks.filter(task => task.assignedTeamIds?.includes(team.id)).length,
      fill: TEAM_COLORS[index % TEAM_COLORS.length],
    };
  }).filter(data => data.tasks > 0);
  const chartConfigTasksByTeam = tasksByTeamData.reduce((acc, cur) => {
    acc[cur.name] = { label: cur.name, color: cur.fill };
    return acc;
  }, {} as any);

  const storyPointsByTeamData = teams.map((team, index) => {
    return {
      name: team.name,
      storyPoints: boardProjectTasks
        .filter(task => task.assignedTeamIds?.includes(team.id))
        .reduce((sum, task) => sum + (task.storyPoints || 0), 0),
      fill: TEAM_COLORS[index % TEAM_COLORS.length],
    };
  }).filter(data => data.storyPoints > 0);
  const chartConfigStoryPointsByTeam = storyPointsByTeamData.reduce((acc, cur) => {
    acc[cur.name] = { label: cur.name, color: cur.fill };
    return acc;
  }, {} as any);

  const totalBacklogItems = backlogProjectTasks.length;
  const totalBacklogStoryPoints = backlogProjectTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);

  const userWorkloadData = users.map(user => {
    const userOpenTasks = openProjectTasks.filter(task => task.assignedUserIds?.includes(user.id));
    const team = teams.find(t => t.id === user.teamId);
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      teamName: team ? team.name : 'No Team',
      openTasksCount: userOpenTasks.length,
      openStoryPoints: userOpenTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0),
    };
  }).sort((a, b) => b.openStoryPoints - a.openStoryPoints || b.openTasksCount - a.openTasksCount);


  return (
    <div className="p-4 md:p-6 lg:p-8 grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-lg rounded-lg col-span-1 lg:col-span-2 xl:col-span-3">
        <CardHeader>
            <CardTitle className="text-xl">Reports for {projectName}</CardTitle>
        </CardHeader>
      </Card>

      <Card className="shadow-lg rounded-lg col-span-1 lg:col-span-2 xl:col-span-3">
        <CardHeader>
            <CardTitle>User Workload Overview (Open Tasks)</CardTitle>
            <CardDescription>Current open tasks (To Do &amp; In Progress) and story points assigned to users.</CardDescription>
        </CardHeader>
        <CardContent>
            {userWorkloadData.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-right">Open Tasks</TableHead>
                            <TableHead className="text-right">Open Story Points</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {userWorkloadData.map(userData => (
                            <TableRow key={userData.id}>
                                <TableCell>
                                    <div className="flex items-center">
                                        <Avatar className="h-8 w-8 mr-2">
                                            {userData.avatar && <AvatarImage src={userData.avatar} alt={userData.name} data-ai-hint="person" />}
                                            <AvatarFallback>{userData.name.substring(0,1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        {userData.name}
                                    </div>
                                </TableCell>
                                <TableCell>{userData.teamName}</TableCell>
                                <TableCell className="text-right">{userData.openTasksCount}</TableCell>
                                <TableCell className="text-right">{userData.openStoryPoints}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                 <p className="text-muted-foreground text-center py-4">No users with assigned open tasks in this project.</p>
            )}
        </CardContent>
      </Card>

      {projectSprints.length > 0 && (
        <Card className="shadow-lg rounded-lg col-span-1 lg:col-span-2 xl:col-span-3">
            <CardHeader>
                <CardTitle>Sprint Performance</CardTitle>
                <CardDescription>Overview of active and completed sprints.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {projectSprints.map(sprint => {
                    const sprintTasks = allProjectTasks.filter(task => task.sprintId === sprint.id);
                    const backlogStatusTitle = ALL_TASK_STATUSES.find(s => s.id === BACKLOG_STATUS_ID)?.title || 'Backlog';
                    const statusesForSprintChart = projectSpecificBoardColumns.concat([{id: BACKLOG_STATUS_ID, title: backlogStatusTitle}]);
                    const tasksByStatusInSprintData = generateTaskStatusChartData(sprintTasks, statusesForSprintChart);
                     const chartConfigSprintStatus = tasksByStatusInSprintData.reduce((acc, cur) => {
                        acc[cur.name] = { label: cur.name, color: cur.fill };
                        return acc;
                    }, {} as any);

                    const completedTasksCount = sprintTasks.filter(t => t.status === 'done').length;
                    const totalTasksCount = sprintTasks.length;
                    const sprintProgress = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

                    const completedStoryPoints = sprintTasks.filter(t => t.status === 'done').reduce((sum, task) => sum + (task.storyPoints || 0), 0);
                    const totalStoryPoints = sprintTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);

                    const startDate = tsToDate(sprint.startDate);
                    const endDate = tsToDate(sprint.endDate);

                    return (
                        <Card key={sprint.id} className="shadow-md">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{sprint.name}</CardTitle>
                                    <Badge variant={sprint.status === 'active' ? 'default' : 'outline'} className="capitalize">
                                        {sprint.status}
                                    </Badge>
                                </div>
                                <CardDescription>
                                     {startDate ? format(startDate, 'MMM dd') : 'N/A'} - {endDate ? format(endDate, 'MMM dd, yyyy') : 'N/A'}
                                </CardDescription>
                                {sprint.goal && <p className="text-xs text-muted-foreground italic">Goal: "{sprint.goal}"</p>}
                            </CardHeader>
                            <CardContent>
                                {sprintTasks.length > 0 ? (
                                    <>
                                        <div className="h-[200px] mb-4">
                                            <ChartContainer config={chartConfigSprintStatus} className="h-full w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                                    <Pie data={tasksByStatusInSprintData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {tasksByStatusInSprintData.map((entry, index) => (
                                                        <Cell key={`cell-sprint-${sprint.id}-${index}`} fill={entry.fill} />
                                                    ))}
                                                    </Pie>
                                                </PieChart>
                                                </ResponsiveContainer>
                                            </ChartContainer>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p>Tasks: {completedTasksCount} / {totalTasksCount} completed</p>
                                            <Progress value={sprintProgress} className="h-2" aria-label={`${sprintProgress.toFixed(0)}% tasks completed`}/>
                                            <p>Story Points: {completedStoryPoints} / {totalStoryPoints} completed</p>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground text-center py-4">No tasks in this sprint.</p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </CardContent>
        </Card>
      )}
      {projectSprints.length === 0 && selectedProjectId && (
         <Card className="shadow-lg rounded-lg col-span-1 lg:col-span-2 xl:col-span-3">
            <CardHeader><CardTitle>Sprint Performance</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground text-center py-4">No active or completed sprints for this project.</p></CardContent>
        </Card>
      )}

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Backlog Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                <div className="flex items-center">
                    <Icons.Backlog className="w-6 h-6 text-primary mr-3"/>
                    <span className="text-lg font-medium">Total Items in Backlog</span>
                </div>
                <span className="text-2xl font-bold text-primary">{totalBacklogItems}</span>
            </div>
             <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                <div className="flex items-center">
                    <Icons.Sparkles className="w-6 h-6 text-accent mr-3"/>
                    <span className="text-lg font-medium">Total Story Points</span>
                </div>
                <span className="text-2xl font-bold text-accent">{totalBacklogStoryPoints}</span>
            </div>
            {totalBacklogItems === 0 && <p className="text-muted-foreground text-center pt-4">Backlog is empty.</p>}
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Tasks by Board Status</CardTitle>
          <CardDescription>Distribution of tasks currently on the Kanban board.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          {tasksByBoardStatusData.length > 0 ? (
            <ChartContainer config={chartConfigBoardStatus} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={tasksByBoardStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {tasksByBoardStatusData.map((entry, index) => (
                      <Cell key={`cell-board-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center pt-10">No tasks on the board.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Tasks by User (Board)</CardTitle>
           <CardDescription>Number of tasks assigned to users on the Kanban board.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
           {tasksByUserData.length > 0 ? (
            <ChartContainer config={chartConfigUserTasks} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByUserData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} interval={0} />
                  <ChartTooltip
                    cursor={{fill: 'hsl(var(--muted))'}}
                    content={<ChartTooltipContent indicator="dot" />}
                   />
                  <Bar dataKey="tasks" radius={[0, 4, 4, 0]} barSize={30}>
                     {tasksByUserData.map((entry, index) => (
                        <Cell key={`cell-user-tasks-${index}`} fill={entry.fill} />
                      ))}
                  </Bar>
                   <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
             <p className="text-muted-foreground text-center pt-10">No assigned tasks on the board.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Story Points by User (Board)</CardTitle>
          <CardDescription>Sum of story points for tasks on the board, by user.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          {storyPointsByUserData.length > 0 ? (
            <ChartContainer config={chartConfigStoryPointsUser} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storyPointsByUserData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" dataKey="storyPoints" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} interval={0} />
                  <ChartTooltip
                    cursor={{fill: 'hsl(var(--muted))'}}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar dataKey="storyPoints" radius={[0, 4, 4, 0]} barSize={30}>
                    {storyPointsByUserData.map((entry, index) => (
                      <Cell key={`cell-sp-user-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center pt-10">No tasks with story points assigned on the board.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Tasks by Team (Board)</CardTitle>
          <CardDescription>Distribution of board tasks among teams (direct assignment).</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          {tasksByTeamData.length > 0 ? (
            <ChartContainer config={chartConfigTasksByTeam} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={tasksByTeamData} dataKey="tasks" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {tasksByTeamData.map((entry, index) => (
                      <Cell key={`cell-teamtasks-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center pt-10">No tasks on the board directly assigned to teams.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Story Points by Team (Board)</CardTitle>
          <CardDescription>Sum of story points for board tasks, by team (direct assignment).</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          {storyPointsByTeamData.length > 0 ? (
            <ChartContainer config={chartConfigStoryPointsByTeam} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={storyPointsByTeamData} dataKey="storyPoints" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {storyPointsByTeamData.map((entry, index) => (
                      <Cell key={`cell-team-sp-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center pt-10">No tasks with story points on the board directly assigned to teams.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

