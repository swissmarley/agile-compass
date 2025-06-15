
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import type { Task, User, Project, Sprint, Team, IssueType } from '@/types';
import { ALL_TASK_STATUSES, ISSUE_TYPES } from '@/config/site';
import { Timestamp } from 'firebase/firestore';

const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
   if (ts instanceof Date) return ts;
  return null;
}

interface ViewTaskDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  task: Task | null;
  users: User[];
  projects: Project[];
  sprints: Sprint[];
  teams: Team[];
  allTasks: Task[];
}

export function ViewTaskDialog({
  isOpen,
  onOpenChange,
  task,
  users,
  projects,
  sprints,
  teams,
  allTasks,
}: ViewTaskDialogProps) {
  if (!task) return null;

  const assignedUsers = task.assignedUserIds?.map(userId => users.find(u => u.id === userId)).filter(Boolean) as User[];
  const assignedTeams = task.assignedTeamIds?.map(teamId => teams.find(t => t.id === teamId)).filter(Boolean) as Team[];
  const project = projects.find(p => p.id === task.projectId);
  const sprint = sprints.find(s => s.id === task.sprintId);

  const statusInfoFromProject = project?.boardColumns?.find(col => col.id === task.status);
  const statusInfoFallback = ALL_TASK_STATUSES.find(s => s.id === task.status);
  const statusDisplayTitle = statusInfoFromProject?.title || statusInfoFallback?.title || task.status;

  const issueTypeInfo = ISSUE_TYPES.find(it => it.id === task.issueType);
  const IssueIcon = issueTypeInfo ? Icons[issueTypeInfo.icon] : Icons.ListChecks;

  const dueDate = tsToDate(task.dueDate);
  const createdAtDate = tsToDate(task.createdAt);

  const parentStory = (task.parentStoryId && allTasks) ? allTasks.find(t => t.id === task.parentStoryId && t.issueType === 'story') : null;
  const parentEpic = (task.epicId && allTasks) ? allTasks.find(t => t.id === task.epicId && t.issueType === 'epic') : null;

  const isEpicView = task.issueType === 'epic';

  const DetailItem = ({ label, value, icon }: { label: string; value?: React.ReactNode; icon?: React.ReactNode }) => (
    <div className="mb-3">
      <div className="text-sm font-medium text-muted-foreground flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        {label}
      </div>
      <div className="text-md text-foreground mt-0.5">{value || 'N/A'}</div>
    </div>
  );

  const canHaveParentStory = ['task', 'bug', 'subtask', 'feature_request'].includes(task.issueType);
  const isStoryType = task.issueType === 'story';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card shadow-xl rounded-lg">
        <DialogHeader className="pb-2">
          <div className="flex items-center">
            {issueTypeInfo && <IssueIcon className="h-6 w-6 mr-2 text-primary shrink-0" />}
            <DialogTitle className="text-2xl font-semibold">{task.title}</DialogTitle>
          </div>
          {project && (
            <DialogDescription className={issueTypeInfo ? 'ml-8' : ''}>
              In project: <span className="font-medium text-primary">{project.name}</span>
            </DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3 py-2">
            {task.description && (
              <DetailItem label="Description" value={<p className="whitespace-pre-wrap">{task.description}</p>} icon={<Icons.Info className="h-4 w-4"/>} />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              <DetailItem
                label="Issue Type"
                value={issueTypeInfo?.title || 'Task'}
                icon={issueTypeInfo ? <IssueIcon className="h-4 w-4" /> : <Icons.ListChecks className="h-4 w-4" />}
              />
              <DetailItem
                label="Status"
                value={<Badge variant={task.status === 'done' ? 'default' : task.status === 'inprogress' ? 'secondary' : 'outline'} className={`capitalize ${task.status === 'done' ? 'bg-accent text-accent-foreground' : ''}`}>{statusDisplayTitle}</Badge>}
                icon={<Icons.ListChecks className="h-4 w-4" />}
              />
              {!isEpicView && (
                <>
                  <DetailItem
                    label="Due Date"
                    value={dueDate ? format(dueDate, 'PPP') : 'Not set'}
                    icon={<Icons.Calendar className="h-4 w-4" />}
                  />
                  <DetailItem
                    label="Story Points"
                    value={task.storyPoints !== undefined && task.storyPoints !== null ? task.storyPoints.toString() : 'Not set'}
                    icon={<Icons.Sparkles className="h-4 w-4" />}
                  />
                  <DetailItem
                    label="Sprint"
                    value={sprint ? `${sprint.name} (${sprint.status})` : 'Backlog (No Sprint)'}
                    icon={<Icons.Sprint className="h-4 w-4" />}
                  />
                </>
              )}
              <DetailItem
                label="Created At"
                value={createdAtDate ? format(createdAtDate, 'PPP p') : 'N/A'}
                icon={<Icons.Calendar className="h-4 w-4" />}
              />
            </div>

            {canHaveParentStory && parentStory && (
              <DetailItem
                label="Parent Story"
                value={parentStory.title}
                icon={<Icons.IssueStory className="h-4 w-4" />}
              />
            )}

            {isStoryType && parentEpic && (
              <DetailItem
                label="Parent Epic"
                value={parentEpic.title}
                icon={<Icons.IssueEpic className="h-4 w-4" />}
              />
            )}

            {!isEpicView && (
              <>
                <div>
                    <DetailItem
                        label="Assigned Users"
                        icon={<Icons.Users className="h-4 w-4" />}
                        value={
                        assignedUsers && assignedUsers.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                            {assignedUsers.map(user => (
                                <div key={user.id} className="flex items-center">
                                <Avatar className="h-6 w-6 mr-1.5">
                                    {user.avatar && <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />}
                                    <AvatarFallback className="text-xs">{user.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{user.name}</span>
                                </div>
                            ))}
                            </div>
                        ) : 'Unassigned'
                        }
                    />
                </div>

                <div>
                    <DetailItem
                        label="Assigned Teams"
                        icon={<Icons.Team className="h-4 w-4" />}
                        value={
                        assignedTeams && assignedTeams.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                            {assignedTeams.map(team => (
                                <Badge key={team.id} variant="secondary">{team.name}</Badge>
                            ))}
                            </div>
                        ) : 'No teams assigned'
                        }
                    />
                </div>
              </>
            )}

            {task.subtasks && task.subtasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground flex items-center mb-1">
                    <Icons.ListChecks className="h-4 w-4 mr-2" /> Subtasks ({task.subtasks.length})
                </h4>
                <ul className="list-disc list-inside pl-2 space-y-1 text-sm text-foreground">
                  {task.subtasks.map((subtask, index) => (
                    <li key={index}>{subtask}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
