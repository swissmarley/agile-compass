
'use client';

import { useEffect, type Dispatch, type SetStateAction, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { sprintFormSchema, type SprintFormValues } from '@/lib/schemas';
import type { Project, Sprint, Task } from '@/types'; // Added Sprint
import { useAppData } from '@/contexts/app-data-context';

const NO_EPIC_VALUE = "@_NO_EPIC_@";

// Helper to convert Timestamp to Date safely for form population
const tsToDate = (ts: Timestamp | Date | undefined): Date | undefined => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return undefined;
}

interface CreateSprintDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  sprintToEdit?: Sprint | null; // For editing existing sprints
  defaultProjectId?: string | null; // For creating new sprints
}

export function CreateSprintDialog({
  isOpen,
  onOpenChange,
  sprintToEdit,
  defaultProjectId,
}: CreateSprintDialogProps) {
  const { projects, selectedProjectId: contextSelectedProjectId, tasks: allTasks, addSprint, updateSprint, sprints: allSprints } = useAppData();
  
  // Determine the project ID: from sprint being edited, or default, or context
  const currentProjectId = sprintToEdit?.projectId || defaultProjectId || contextSelectedProjectId;

  const form = useForm<SprintFormValues>({
    resolver: zodResolver(sprintFormSchema),
    defaultValues: {
      name: '',
      goal: '',
      startDate: undefined,
      endDate: undefined,
      epicId: NO_EPIC_VALUE,
    },
  });

  const projectEpics = useMemo(() => {
    if (!currentProjectId) return [];
    return allTasks.filter(task => task.projectId === currentProjectId && task.issueType === 'epic');
  }, [allTasks, currentProjectId]);

  useEffect(() => {
    if (isOpen) {
      if (sprintToEdit) {
        form.reset({
          name: sprintToEdit.name,
          goal: sprintToEdit.goal || '',
          startDate: tsToDate(sprintToEdit.startDate),
          endDate: tsToDate(sprintToEdit.endDate),
          epicId: sprintToEdit.epicId || NO_EPIC_VALUE,
        });
      } else {
        form.reset({
          name: '',
          goal: '',
          startDate: undefined,
          endDate: undefined,
          epicId: NO_EPIC_VALUE,
        });
      }
    }
  }, [isOpen, sprintToEdit, form]);


  const onSubmit = (values: SprintFormValues) => {
    const finalValues = {
      ...values,
      epicId: values.epicId === NO_EPIC_VALUE ? null : values.epicId,
    };

    if (sprintToEdit) { // Editing existing sprint
      const originalSprintData = allSprints.find(s => s.id === sprintToEdit.id);
      updateSprint({
        ...sprintToEdit,
        ...finalValues,
        // Ensure dates are Timestamps before sending to updateSprint
        startDate: finalValues.startDate ? Timestamp.fromDate(finalValues.startDate) : sprintToEdit.startDate,
        endDate: finalValues.endDate ? Timestamp.fromDate(finalValues.endDate) : sprintToEdit.endDate,
      }, originalSprintData);
    } else { // Creating new sprint
      if (!currentProjectId) {
          console.error("No project ID available to create sprint.");
          // Potentially show a toast or alert to the user
          return;
      }
      // Ensure dates are present and are Date objects for addSprint
      if (!finalValues.startDate || !finalValues.endDate) {
        console.error("Start date and end date are required for new sprint.");
        // Add user feedback if necessary (e.g., toast)
        return;
      }
      addSprint(finalValues as Required<SprintFormValues>, currentProjectId);
    }
    onOpenChange(false);
  };

  const currentProjectForDisplay = projects.find(p => p.id === currentProjectId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        form.reset();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {sprintToEdit ? 'Edit Sprint' : 'Create New Sprint'}
          </DialogTitle>
          <DialogDescription>
            {sprintToEdit ? 'Update the details of this sprint.' : 'Plan your work by creating a new sprint.'}
             { currentProjectForDisplay && !sprintToEdit && ` for project: ${currentProjectForDisplay.name}` }
             { sprintToEdit && ` in project: ${projects.find(p => p.id === sprintToEdit.projectId)?.name || 'Unknown'}` }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sprint Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sprint #1 - MVP" {...field} className="text-base"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sprint Goal (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What is the main objective of this sprint?"
                      rows={3}
                      {...field}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="epicId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Epic (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || NO_EPIC_VALUE}
                    disabled={!currentProjectId || projectEpics.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!currentProjectId ? "Select project first" : (projectEpics.length === 0 ? "No epics in this project" : "Assign to an Epic")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_EPIC_VALUE}>No Epic</SelectItem>
                      {projectEpics.map((epic) => (
                        <SelectItem key={epic.id} value={epic.id}>
                          <div className="flex items-center">
                            <Icons.IssueEpic className="mr-2 h-4 w-4 text-muted-foreground" />
                            {epic.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
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
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
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
                           disabled={(date) =>
                            form.getValues("startDate") ? date < form.getValues("startDate") : false
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!currentProjectId && !sprintToEdit || (!form.formState.isValid && form.formState.isSubmitted)}
              >
                <Icons.Sprint className="mr-2 h-4 w-4" />
                 {sprintToEdit ? 'Save Changes' : 'Create Sprint'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
