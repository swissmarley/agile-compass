
'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { Task, User, Team } from '@/types';
import { ISSUE_TYPES, BACKLOG_STATUS_ID } from '@/config/site';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppData } from '@/contexts/app-data-context';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth
import { cn } from '@/lib/utils'; // Import cn

// Helper to convert Timestamp to Date safely
const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

interface KanbanTaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onMoveToBacklog: (taskId: string) => void;
}

export function KanbanTaskCard({ task, onDragStart, onEditTask, onViewTask, onMoveToBacklog }: KanbanTaskCardProps) {
  const { users, teams, tasks: allTasks } = useAppData(); // Added allTasks
  const { appUser } = useAuth();

  const canModifyTask = appUser?.role === 'Administrator' || appUser?.role === 'Manager' || appUser?.role === 'Supervisor';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (canModifyTask) {
      onDragStart(e, task.id);
    } else {
      e.preventDefault();
    }
  };

  const issueTypeConfig = ISSUE_TYPES.find(it => it.id === task.issueType);
  const IssueIcon = issueTypeConfig ? Icons[issueTypeConfig.icon] : Icons.ListChecks;

  const assignedUsers = task.assignedUserIds?.map(userId => users.find(u => u.id === userId)).filter(Boolean) as User[];
  const assignedTeams = task.assignedTeamIds?.map(teamId => teams.find(t => t.id === teamId)).filter(Boolean) as Team[];

  const dueDate = tsToDate(task.dueDate);

  const parentStory = (task.parentStoryId && allTasks) ? allTasks.find(t => t.id === task.parentStoryId && t.issueType === 'story') : null;
  const parentEpic = (task.epicId && allTasks) ? allTasks.find(t => t.id === task.epicId && t.issueType === 'epic') : null;

  let hierarchyBorderClass = '';
  if (task.issueType === 'epic') {
    hierarchyBorderClass = 'border-l-4 border-l-primary';
  } else if (task.issueType === 'story') {
    hierarchyBorderClass = 'border-l-4 border-l-accent';
  } else if (parentStory || parentEpic) { // Could be a task under a story, or a story under an epic
    hierarchyBorderClass = 'border-l-4 border-l-secondary';
  }


  return (
    <Card
      draggable={canModifyTask}
      onDragStart={handleDragStart}
      className={cn(
        "mb-3 cursor-grab active:cursor-grabbing bg-card hover:shadow-md transition-shadow duration-200 rounded-lg border",
        hierarchyBorderClass // Apply dynamic border class
      )}
      aria-label={`Task: ${task.title}`}
    >
      <CardHeader className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center flex-grow mr-2 min-w-0" onClick={() => onViewTask(task)}>
            <Tooltip>
              <TooltipTrigger asChild>
                 <IssueIcon className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{issueTypeConfig?.title || 'Task'}</p>
              </TooltipContent>
            </Tooltip>
            <CardTitle className="text-base font-semibold leading-tight truncate">
              {task.title}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {canModifyTask && (
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMoveToBacklog(task.id)} aria-label="Move to backlog">
                          <Icons.Archive className="h-4 w-4" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Move to Backlog</p></TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewTask(task)} aria-label="View task details">
                    <Icons.View className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>View Details</p></TooltipContent>
            </Tooltip>
            {canModifyTask && (
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditTask(task)} aria-label="Edit task">
                      <Icons.Edit className="h-4 w-4" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Edit Task</p></TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {task.description && (
           <CardDescription
              className="text-xs text-muted-foreground mt-1 line-clamp-2 cursor-pointer"
              onClick={() => onViewTask(task)}
           >
            {task.description}
          </CardDescription>
        )}
        {/* Display Parent Story or Epic Info */}
        {parentStory && (
          <div className="mt-1.5 text-xs text-muted-foreground flex items-center cursor-pointer" onClick={() => onViewTask(task)}>
            <Icons.IssueStory className="h-3.5 w-3.5 mr-1 text-secondary-foreground" />
            <span className="font-medium mr-1 text-secondary-foreground">Story:</span>
            <span className="truncate" title={parentStory.title}>{parentStory.title}</span>
          </div>
        )}
        {parentEpic && (
          <div className="mt-1.5 text-xs text-muted-foreground flex items-center cursor-pointer" onClick={() => onViewTask(task)}>
            <Icons.IssueEpic className="h-3.5 w-3.5 mr-1 text-primary" />
            <span className="font-medium mr-1 text-primary">Epic:</span>
            <span className="truncate" title={parentEpic.title}>{parentEpic.title}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0" onClick={() => onViewTask(task)}>
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
          {dueDate && (
            <div className="flex items-center space-x-1">
              <Icons.Calendar className="h-3 w-3" />
              <span>{format(dueDate, 'MMM dd')}</span>
            </div>
          )}
          {!dueDate && <div className="flex-grow"></div>}
          <div className="flex items-center space-x-1">
            {assignedUsers && assignedUsers.slice(0, 2).map(user => (
              <Tooltip key={user.id}>
                <TooltipTrigger asChild>
                  <Avatar className="h-5 w-5 border-background border">
                    {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {user.name.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent><p>{user.name}</p></TooltipContent>
              </Tooltip>
            ))}
            {assignedUsers && assignedUsers.length > 2 && (
                <Badge variant="outline" className="text-xs p-1">+{assignedUsers.length -2}</Badge>
            )}
            {assignedTeams && assignedTeams.slice(0,1).map(team => (
                <Tooltip key={team.id}>
                    <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs p-1">{team.name.substring(0,3)}..</Badge>
                    </TooltipTrigger>
                    <TooltipContent><p>{team.name}</p></TooltipContent>
                </Tooltip>
            ))}
             {assignedTeams && assignedTeams.length > 1 && (
                <Badge variant="outline" className="text-xs p-1">+{assignedTeams.length -1} T</Badge>
            )}
          </div>
        </div>
        {task.storyPoints !== undefined && task.storyPoints !== null && (
          <Badge variant="outline" className="text-xs mt-1">
            {task.storyPoints} pts
          </Badge>
        )}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Subtasks: {task.subtasks.length}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
