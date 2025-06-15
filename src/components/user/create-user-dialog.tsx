
'use client';

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { userFormSchema, type UserFormValues } from '@/lib/schemas';
import type { User, Team, Role } from '@/types';
import { useAuth } from '@/contexts/auth-context';

const NO_TEAM_VALUE = "@_NO_TEAM_@";
const ROLES: Role[] = ['User', 'Supervisor', 'Manager', 'Administrator'];

interface CreateUserDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onUserSubmit: (userData: UserFormValues) => void;
  userToEdit?: User | null;
  teams: Team[];
}

export function CreateUserDialog({
  isOpen, onOpenChange, onUserSubmit, userToEdit, teams
}: CreateUserDialogProps) {
  const { appUser: currentUser } = useAuth(); // Get current logged-in user
  const currentUserRole = currentUser?.role;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      id: '', // Firebase Auth UID
      name: '',
      avatar: '',
      teamId: NO_TEAM_VALUE,
      role: 'User',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        form.reset({
          id: userToEdit.id,
          name: userToEdit.name,
          avatar: userToEdit.avatar || '',
          teamId: userToEdit.teamId || NO_TEAM_VALUE,
          role: userToEdit.role || 'User',
        });
      } else {
        form.reset({ id: '', name: '', avatar: '', teamId: NO_TEAM_VALUE, role: 'User' });
      }
    }
  }, [userToEdit, isOpen, form]);

  const onSubmit = (values: UserFormValues) => {
    const finalValues = {
      ...values,
      teamId: values.teamId === NO_TEAM_VALUE ? null : values.teamId,
    };
    onUserSubmit(finalValues);
    onOpenChange(false);
  };

  // Determine if the role field should be disabled
  const roleFieldDisabled = currentUserRole !== 'Administrator' || (userToEdit?.id === currentUser?.id);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) { form.reset(); }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {userToEdit ? 'Edit User Profile' : 'Create New User Profile'}
          </DialogTitle>
          <DialogDescription>
            {userToEdit ? 'Update user profile details.' :
            'Add a new user profile. The Firebase Authentication user (with email/password) must be created separately in the Firebase Console first.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID (Firebase Auth UID)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Firebase Auth UID"
                      {...field}
                      className="text-base"
                      disabled={!!userToEdit} // UID is not editable
                    />
                  </FormControl>
                  {!userToEdit && <FormMessage className="text-xs">This ID must match the UID from Firebase Authentication.</FormMessage>}
                  {userToEdit && <FormMessage className="text-xs">User ID cannot be changed.</FormMessage>}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Name</FormLabel>
                  <FormControl><Input placeholder="e.g., John Doe" {...field} className="text-base"/></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL (Optional)</FormLabel>
                  <FormControl><Input placeholder="https://example.com/avatar.png" {...field} className="text-sm"/></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || NO_TEAM_VALUE}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Assign to a team (optional)" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NO_TEAM_VALUE}>No Team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={roleFieldDisabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {roleFieldDisabled && userToEdit?.id === currentUser?.id && (
                    <FormMessage className="text-xs">Administrators cannot change their own role.</FormMessage>
                  )}
                  {roleFieldDisabled && currentUserRole !== 'Administrator' && (
                     <FormMessage className="text-xs">Only Administrators can change roles.</FormMessage>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Icons.AddUser className="mr-2 h-4 w-4" />
                {userToEdit ? 'Save Changes' : 'Create User Profile'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
