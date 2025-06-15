
'use client';

import { useState } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { UserList } from '@/components/user/user-list';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User } from '@/types';
import { useAuth } from '@/contexts/auth-context';

export default function UsersPage() {
  const { appUser } = useAuth();
  const {
    users, teams, isLoading, openCreateUserDialog, deleteUser,
  } = useAppData();

  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const canManageUsers = appUser?.role === 'Administrator';

  const handleOpenCreateDialog = () => {
    if (openCreateUserDialog && canManageUsers) { openCreateUserDialog(); }
    else if (!canManageUsers) { alert("You do not have permission to create users."); }
  };

  const handleOpenEditDialog = (user: User) => {
    // Admins can edit anyone. Non-admins cannot edit users via this page.
    if (openCreateUserDialog && canManageUsers) { openCreateUserDialog(user); }
    else { alert("You do not have permission to edit users."); }
  };

  const handleDeleteConfirmation = (user: User) => {
    if (canManageUsers) {
        if (user.id === appUser?.id) {
            alert("Administrators cannot delete their own user profile via this interface.");
            return;
        }
        setUserToDelete(user);
    }
    else { alert("You do not have permission to delete users."); }
  };

  const executeDeleteUser = async () => {
    if (userToDelete && canManageUsers) {
      if(userToDelete.id === appUser?.id) {
           alert("Administrators cannot delete their own user profile.");
           setUserToDelete(null);
           return;
      }
      try {
        await deleteUser(userToDelete.id);
      } catch(error) {
         console.error("Failed to delete user:", error);
      } finally {
          setUserToDelete(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card p-4 rounded-lg shadow">
              <div className="flex items-center mb-3">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <Skeleton className="h-6 w-3/4" />
              </div>
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!canManageUsers) {
      return (
        <div className="p-4 md:p-6 lg:p-8 text-center">
          <Icons.Warning className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to manage users.</p>
        </div>
      );
  }


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Manage Users</h1>
        {canManageUsers && (
            <Button onClick={handleOpenCreateDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Icons.AddUser className="mr-2 h-5 w-5" /> Create User Profile
            </Button>
        )}
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 p-8 text-center border border-dashed rounded-lg">
          <Icons.Users className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Users Yet</h2>
          <p className="text-muted-foreground">Click the "Create User Profile" button to add user profiles to the system.</p>
        </div>
      ) : (
        <UserList
          users={users.sort((a,b) => (a.createdAt?.getTime() ?? 0) > (b.createdAt?.getTime() ?? 0) ? -1 : 1)}
          teams={teams}
          onEditUser={handleOpenEditDialog}
          onDeleteUser={(userId) => {
            const user = users.find(u => u.id === userId);
            if (user) handleDeleteConfirmation(user);
          }}
        />
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user data for
              <span className="font-semibold"> "{userToDelete?.name}"</span> and unassign them from any tasks or teams.
               This does <span className='font-bold'>not</span> delete their login account from Firebase Authentication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
