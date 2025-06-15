
'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { Task, User, Team } from '@/types';
import { ArrowRightCircle } from 'lucide-react';
import { ISSUE_TYPES } from '@/config/site';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppData } from '@/contexts/app-data-context';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

// Helper to convert Timestamp to Date safely
const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}


interface BacklogListItemProps {
  task: Task;
  onMoveToBoard: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
}

export function BacklogListItem({ task, onMoveToBoard, onEditTask, onViewTask }: BacklogListItemProps) {
  const { users, teams } = useAppData();
  const { appUser } = useAuth(); // Get appUser for role check

  const canModifyTask = appUser?.role === 'Administrator' || appUser?.role === 'Manager' || appUser?.role === 'Supervisor';

  const issueTypeConfig = ISSUE_TYPES.find(it => it.id === task.issueType);
  const IssueIcon = issueTypeConfig ? Icons[issueTypeConfig.icon] : Icons.ListChecks;

  const assignedUsers = task.assignedUserIds?.map(userId => users.find(u => u.id === userId)).filter(Boolean) as User[];
  const assignedTeams = task.assignedTeamIds?.map(teamId => teams.find(t => t.id === teamId)).filter(Boolean) as Team[];

  const dueDate = tsToDate(task.dueDate);
  const createdAtDate = tsToDate(task.createdAt);

  return (
    <Card
      className="mb-4 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg border"
      aria-label={`Backlog item: ${task.title}`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex-grow cursor-pointer" onClick={() => onViewTask(task)}>
          <div className="flex items-center">
            <Tooltip>
                <TooltipTrigger asChild>
                    <IssueIcon className="h-5 w-5 mr-2 shrink-0 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{issueTypeConfig?.title || 'Task'}</p>
                </TooltipContent>
            </Tooltip>
            <CardTitle className="text-lg font-semibold leading-tight">
                {task.title}
            </CardTitle>
          </div>
          {task.description && (
            <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2 ml-7">
              {task.description}
            </CardDescription>
          )}
          <div className="flex items-center text-xs text-muted-foreground mt-2 space-x-4 ml-7 flex-wrap gap-y-1">
            {dueDate && (
              <div className="flex items-center space-x-1">
                <Icons.Calendar className="h-3.5 w-3.5" />
                <span>Due: {format(dueDate, 'MMM dd, yyyy')}</span>
              </div>
            )}
            {assignedUsers && assignedUsers.length > 0 && (
              <div className="flex items-center space-x-1">
                {assignedUsers.slice(0, 2).map(user => (
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
                {assignedUsers.length > 2 && <Badge variant="outline" className="text-xs p-1">+{assignedUsers.length - 2}</Badge>}
              </div>
            )}
            {assignedTeams && assignedTeams.length > 0 && (
                 <div className="flex items-center space-x-1">
                    {assignedTeams.slice(0,1).map(team => (
                        <Tooltip key={team.id}>
                            <TooltipTrigger asChild>
                                 <Badge variant="secondary" className="text-xs p-1">{team.name.substring(0,3)}..</Badge>
                            </TooltipTrigger>
                            <TooltipContent><p>{team.name}</p></TooltipContent>
                        </Tooltip>
                    ))}
                    {assignedTeams.length > 1 && <Badge variant="outline" className="text-xs p-1">+{assignedTeams.length - 1} T</Badge>}
                 </div>
            )}
             {createdAtDate && (
                 <div className="flex items-center space-x-1">
                    <Icons.Info className="h-3.5 w-3.5" />
                    <span>Created: {format(createdAtDate, 'MMM dd, yyyy')}</span>
                  </div>
             )}
          </div>
           {task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-2 ml-7">
                <p className="text-xs font-medium text-muted-foreground mb-1">Subtasks ({task.subtasks.length}):</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                {task.subtasks.slice(0,2).map((subtask, index) => (
                    <li key={index} className="text-xs text-muted-foreground truncate">
                    {subtask}
                    </li>
                ))}
                {task.subtasks.length > 2 && <li className="text-xs text-muted-foreground italic">...and {task.subtasks.length - 2} more</li>}
                </ul>
            </div>
            )}
             {task.storyPoints !== undefined && task.storyPoints !== null && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-2 ml-7">
                    <Icons.Sparkles className="h-3.5 w-3.5" />
                    <span>Story Points: {task.storyPoints}</span>
                </div>
            )}
        </div>
        <div className="flex flex-col items-end space-y-2 ml-4 shrink-0">
            <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onViewTask(task); }}
                aria-label="View task details"
                className="w-full"
            >
                <Icons.View className="mr-2 h-4 w-4" /> View
            </Button>
            {canModifyTask && (
              <>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                    aria-label="Edit task"
                    className="w-full"
                >
                    <Icons.Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onMoveToBoard(task.id); }}
                    aria-label="Move to board"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    <ArrowRightCircle className="mr-2 h-4 w-4" /> Move to Board
                </Button>
              </>
            )}
        </div>
      </div>
    </Card>
  );
}
