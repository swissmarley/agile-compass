
'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { projectFormSchema, type ProjectFormValues } from '@/lib/schemas';
import type { User, Team } from '@/types';
import { useAppData } from '@/contexts/app-data-context';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';


interface CreateProjectDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onProjectSubmit: (projectData: ProjectFormValues) => void;
  users: User[];
  teams: Team[];
}

export function CreateProjectDialog({
  isOpen,
  onOpenChange,
  onProjectSubmit,
  users,
  teams,
}: CreateProjectDialogProps) {
  const [userSearch, setUserSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      allowedUserIds: [],
      allowedTeamIds: [],
    },
  });

  useEffect(() => {
    if (!isOpen) {
        form.reset({
            name: '',
            description: '',
            allowedUserIds: [],
            allowedTeamIds: [],
        });
        setUserSearch('');
        setTeamSearch('');
    }
  }, [isOpen, form]);


  const onSubmit = (values: ProjectFormValues) => {
    onProjectSubmit(values);
    onOpenChange(false);
  };

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
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Fill in the details to create a new project. You can assign users and teams who will have access.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
            <ScrollArea className="max-h-[60vh] pr-3">
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Marketing Campaign" {...field} className="text-base"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the project..."
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
                  name="allowedUserIds"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Allowed Users (Optional)</FormLabel>
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
                  name="allowedTeamIds"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Allowed Teams (Optional)</FormLabel>
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
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Icons.AddProject className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
