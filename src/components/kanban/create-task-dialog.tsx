
'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore'; 

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { taskFormSchema, type TaskFormValues } from '@/lib/schemas';
import type { Task, User, Project, Sprint, IssueType, Team, KanbanStatus } from '@/types'; // KanbanStatus is string
import { suggestTaskDetails } from '@/ai/flows/suggest-task-details';
import { useToast } from '@/hooks/use-toast';
import { ISSUE_TYPES, DEFAULT_ISSUE_TYPE, BACKLOG_STATUS_ID } from '@/config/site';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useAppData } from '@/contexts/app-data-context';


const NO_SPRINT_VALUE = "@_NO_SPRINT_@";
const NO_PARENT_VALUE = "@_NO_PARENT_@";

const tsToDate = (ts: Timestamp | Date | undefined): Date | undefined => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts; 
  return undefined;
}


interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onTaskSubmit: (taskData: TaskFormValues) => void; 
  taskToEdit?: Task | null;
  defaultStatus?: string; 
  defaultProjectId?: string | null;
  defaultIssueType?: IssueType;
}

export function CreateTaskDialog({
  isOpen,
  onOpenChange,
  onTaskSubmit,
  taskToEdit,
  defaultStatus = BACKLOG_STATUS_ID, 
  defaultProjectId,
  defaultIssueType = DEFAULT_ISSUE_TYPE,
}: CreateTaskDialogProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);
  
  const { users, projects, sprints, teams, tasks: allTasks } = useAppData();


  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
  });

  const watchedIssueType = useWatch({ control: form.control, name: 'issueType' }) || (taskToEdit ? taskToEdit.issueType : defaultIssueType);
  const currentSelectedProjectId = useWatch({ control: form.control, name: 'projectId' }) || defaultProjectId || null;

  useEffect(() => {
    if (isOpen) {
      const initialProjectId = taskToEdit?.projectId || defaultProjectId || (projects.length > 0 ? projects[0].id : undefined);
      const initialIssueType = taskToEdit?.issueType || defaultIssueType;
      
      form.reset({
        title: taskToEdit?.title || '',
        description: taskToEdit?.description || '',
        assignedUserIds: taskToEdit?.assignedUserIds || [],
        assignedTeamIds: taskToEdit?.assignedTeamIds || [],
        dueDate: tsToDate(taskToEdit?.dueDate), 
        subtasks: Array.isArray(taskToEdit?.subtasks) ? taskToEdit.subtasks.join('\n') : '',
        projectId: initialProjectId,
        storyPoints: taskToEdit?.storyPoints ?? undefined, 
        sprintId: taskToEdit?.sprintId || NO_SPRINT_VALUE,
        issueType: initialIssueType,
        parentStoryId: taskToEdit?.parentStoryId || NO_PARENT_VALUE,
        epicId: taskToEdit?.epicId || NO_PARENT_VALUE,
      });
    }
  }, [taskToEdit, isOpen, defaultProjectId, form, projects, defaultIssueType]);


  const onSubmit = (values: TaskFormValues) => {
    const finalProjectId = values.projectId || defaultProjectId;
     if (!finalProjectId && !taskToEdit) {
      toast({
        title: "Project Required",
        description: "A project must be selected to create or edit a task.",
        variant: "destructive",
      });
      return;
    }
    // Clear parentStoryId/epicId if not applicable for the issue type
    const finalValues = { ...values };
    if (values.issueType === 'epic') {
      finalValues.parentStoryId = null;
      finalValues.epicId = null;
    } else if (values.issueType === 'story') {
      finalValues.parentStoryId = null; // A story cannot have a parent story
      finalValues.epicId = values.epicId === NO_PARENT_VALUE ? null : values.epicId;
    } else { // Task, Bug, Subtask, Feature Request
      finalValues.epicId = null; // These types do not link directly to epics
      finalValues.parentStoryId = values.parentStoryId === NO_PARENT_VALUE ? null : values.parentStoryId;
    }


    onTaskSubmit(finalValues);
    onOpenChange(false);
  };

  const handleSuggestDetails = async () => {
    const title = form.getValues('title');
    if (!(title || '').trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a task title before suggesting details.",
        variant: "destructive",
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await suggestTaskDetails({ title });
      form.setValue('description', result.description, { shouldValidate: true });
      form.setValue('subtasks', result.subtasks.join('\n'), { shouldValidate: true });
      toast({
        title: "AI Suggestions Applied",
        description: "Description and subtasks have been populated.",
        variant: "default",
        className: "bg-accent text-accent-foreground"
      });
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      toast({
        title: "AI Suggestion Failed",
        description: "Could not fetch suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const currentProjectForDisplay = projects.find(p => p.id === currentSelectedProjectId);
  const availableSprints = sprints.filter(s => s.projectId === currentSelectedProjectId);
  
  const parentStoriesForSelect = allTasks.filter(task => task.issueType === 'story' && task.projectId === currentSelectedProjectId);
  const parentEpicsForSelect = allTasks.filter(task => task.issueType === 'epic' && task.projectId === currentSelectedProjectId);

  const currentActualIssueType = watchedIssueType || defaultIssueType;
  const issueTypeConfig = ISSUE_TYPES.find(it => it.id === currentActualIssueType);
  
  const isEpicType = currentActualIssueType === 'epic';
  const isStoryType = currentActualIssueType === 'story';
  const isChildOfStoryType = ['task', 'bug', 'subtask', 'feature_request'].includes(currentActualIssueType);
  
  const showAiButtonAndSubtasks = !isEpicType;


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        form.reset(); 
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {taskToEdit ? `Edit ${issueTypeConfig?.title || 'Item'}` : `Create New ${issueTypeConfig?.title || 'Item'}`}
          </DialogTitle>
          <DialogDescription>
            {taskToEdit ? 'Update the details.' : 'Fill in the details to create a new item.'}
             { currentProjectForDisplay && ` for project: ${currentProjectForDisplay.name}` }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 p-1 max-h-[70vh] overflow-y-auto">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Implement feature X" {...field} className="text-base"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('sprintId', NO_SPRINT_VALUE);
                          form.setValue('parentStoryId', NO_PARENT_VALUE);
                          form.setValue('epicId', NO_PARENT_VALUE);
                      }}
                      value={field.value || ""}
                      disabled={!!taskToEdit || (!!defaultProjectId && !taskToEdit && projects.length === 1)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                         {projects.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">No projects available.</div>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {!field.value && projects.length > 0 && !taskToEdit && (
                       <p className="text-xs text-destructive">Please select a project.</p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="issueType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || DEFAULT_ISSUE_TYPE}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select issue type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ISSUE_TYPES.map((type) => {
                          const IconComponent = Icons[type.icon];
                          return (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center">
                                <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" />
                                {type.title}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="relative">
              {showAiButtonAndSubtasks && (
                  <Button
                      type="button"
                      onClick={handleSuggestDetails}
                      disabled={isAiLoading || !(form.getValues('title') || '').trim()}
                      variant="outline"
                      size="sm"
                      className="absolute top-0 right-0 -mt-8 text-xs"
                  >
                      {isAiLoading ? (
                      <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                      <Icons.Sparkles className="mr-2 h-4 w-4 text-primary" />
                      )}
                      Suggest Details
                  </Button>
              )}
              <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                      <Textarea
                          placeholder={isEpicType ? "High-level goal or theme of this epic..." : "Detailed description..."}
                          rows={4}
                          {...field}
                          className="text-sm"
                      />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
            </div>

            {showAiButtonAndSubtasks && (
              <FormField
                control={form.control}
                name="subtasks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtasks (one per line)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Subtask 1&#10;Subtask 2"
                        rows={3}
                        {...field}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {isStoryType && (
                 <FormField
                    control={form.control}
                    name="epicId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Parent Epic (Optional)</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value || NO_PARENT_VALUE}
                            disabled={!currentSelectedProjectId} 
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!currentSelectedProjectId ? "Select project first" : "Assign to an Epic"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value={NO_PARENT_VALUE}>No Parent Epic</SelectItem>
                                {parentEpicsForSelect.map((epic) => (
                                    <SelectItem key={epic.id} value={epic.id}>
                                        {epic.title}
                                    </SelectItem>
                                ))}
                                {parentEpicsForSelect.length === 0 && currentSelectedProjectId && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No Epics in this project.</div>
                                )}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {isChildOfStoryType && (
                 <FormField
                    control={form.control}
                    name="parentStoryId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Parent Story (Optional)</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value || NO_PARENT_VALUE}
                            disabled={!currentSelectedProjectId} 
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!currentSelectedProjectId ? "Select project first" : "Assign to a Story"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value={NO_PARENT_VALUE}>No Parent Story</SelectItem>
                                {parentStoriesForSelect.map((story) => (
                                    <SelectItem key={story.id} value={story.id}>
                                        {story.title}
                                    </SelectItem>
                                ))}
                                {parentStoriesForSelect.length === 0 && currentSelectedProjectId && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No Stories in this project.</div>
                                )}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {!isEpicType && (
              <>
                <FormField
                control={form.control}
                name="assignedUserIds"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Assigned Users</FormLabel>
                    <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                        <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={userPopoverOpen}
                            className="w-full justify-between text-sm font-normal"
                        >
                            <span className="truncate">
                            {field.value && field.value.length > 0
                                ? field.value
                                    .map(userId => users.find(u => u.id === userId)?.name)
                                    .filter(Boolean)
                                    .join(', ')
                                : "Select users..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search users..." value={userSearch} onValueChange={setUserSearch} />
                            <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                                {users.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.name}
                                    onSelect={() => {
                                    const currentAssigned = field.value || [];
                                    const newAssigned = currentAssigned.includes(user.id)
                                        ? currentAssigned.filter(id => id !== user.id)
                                        : [...currentAssigned, user.id];
                                    field.onChange(newAssigned);
                                    }}
                                >
                                    <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value?.includes(user.id) ? "opacity-100" : "opacity-0"
                                    )}
                                    />
                                    {user.name}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {field.value.map(userId => {
                                const user = users.find(u => u.id === userId);
                                return user ? <Badge key={userId} variant="secondary">{user.name} <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => field.onChange(field.value?.filter(id => id !== userId))} /></Badge> : null;
                            })}
                        </div>
                    )}
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="assignedTeamIds"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Assigned Teams</FormLabel>
                    <Popover open={teamPopoverOpen} onOpenChange={setTeamPopoverOpen}>
                        <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={teamPopoverOpen}
                            className="w-full justify-between text-sm font-normal"
                        >
                            <span className="truncate">
                            {field.value && field.value.length > 0
                                ? field.value
                                    .map(teamId => teams.find(t => t.id === teamId)?.name)
                                    .filter(Boolean)
                                    .join(', ')
                                : "Select teams..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search teams..." value={teamSearch} onValueChange={setTeamSearch}/>
                            <CommandList>
                            <CommandEmpty>No teams found.</CommandEmpty>
                            <CommandGroup>
                                {teams.map((team) => (
                                <CommandItem
                                    key={team.id}
                                    value={team.name}
                                    onSelect={() => {
                                    const currentAssigned = field.value || [];
                                    const newAssigned = currentAssigned.includes(team.id)
                                        ? currentAssigned.filter(id => id !== team.id)
                                        : [...currentAssigned, team.id];
                                    field.onChange(newAssigned);
                                    }}
                                >
                                    <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value?.includes(team.id) ? "opacity-100" : "opacity-0"
                                    )}
                                    />
                                    {team.name}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {field.value.map(teamId => {
                                const team = teams.find(t => t.id === teamId);
                                return team ? <Badge key={teamId} variant="secondary">{team.name} <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => field.onChange(field.value?.filter(id => id !== teamId))} /></Badge> : null;
                            })}
                        </div>
                    )}
                    <FormMessage />
                    </FormItem>
                )}
                />


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={'outline'}
                                className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                                )}
                            >
                                {field.value ? (
                                format(new Date(field.value), 'PPP')
                                ) : (
                                <span>Pick a date</span>
                                )}
                                <Icons.Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date)}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) }
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                    <FormField
                        control={form.control}
                        name="storyPoints"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Story Points</FormLabel>
                            <FormControl>
                                <Input
                                type="number"
                                placeholder="e.g., 3"
                                {...field}
                                value={field.value ?? ''} 
                                onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                                className="text-sm"
                                min="0"
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <FormField
                        control={form.control}
                        name="sprintId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Sprint</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value || NO_SPRINT_VALUE}
                                disabled={!currentSelectedProjectId} 
                            >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={!currentSelectedProjectId ? "Select project first" : "Assign to sprint (optional)"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={NO_SPRINT_VALUE}>Backlog (No Sprint)</SelectItem>
                                    {availableSprints
                                        .filter(s => s.status === 'planned' || s.status === 'active')
                                        .map((sprint) => (
                                        <SelectItem key={sprint.id} value={sprint.id}>
                                            {sprint.name} ({sprint.status})
                                        </SelectItem>
                                    ))}
                                    {availableSprints.length === 0 && currentSelectedProjectId && (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No available sprints for this project.</div>
                                    )}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              </>
            )}
            <DialogFooter className="pt-4 sticky bottom-0 bg-card pb-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isAiLoading || (!form.formState.isValid && form.formState.isSubmitted) || (!currentSelectedProjectId && projects.length > 0)}
              >
                {isAiLoading && <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />}
                {taskToEdit ? `Save ${issueTypeConfig?.title || 'Item'}` : `Create ${issueTypeConfig?.title || 'Item'}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onTaskSubmit: (taskData: TaskFormValues) => void; 
  taskToEdit?: Task | null;
  defaultStatus?: string; 
  defaultProjectId?: string | null;
  defaultIssueType?: IssueType;
}
