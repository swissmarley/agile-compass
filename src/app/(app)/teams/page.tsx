
'use client';

import { useState } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamList } from '@/components/team/team-list';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Team } from '@/types';
import { useAuth } from '@/contexts/auth-context';

export default function TeamsPage() {
  const { appUser } = useAuth();
  const {
    teams,
    users,
    isLoading,
    openCreateTeamDialog,
    deleteTeam,
  } = useAppData();

  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const canManageTeams = appUser?.role === 'Administrator';

  const handleOpenCreateDialog = () => {
    if (openCreateTeamDialog && canManageTeams) {
      openCreateTeamDialog();
    } else if (!canManageTeams) {
        alert("You do not have permission to create teams.");
    }
  };

  const handleOpenEditDialog = (team: Team) => {
    if (openCreateTeamDialog && canManageTeams) {
      openCreateTeamDialog(team);
    } else if (!canManageTeams) {
        alert("You do not have permission to edit teams.");
    }
  };

  const handleDeleteConfirmation = (team: Team) => {
     if (canManageTeams) {
        setTeamToDelete(team);
    } else {
         alert("You do not have permission to delete teams.");
    }
  };

  const executeDeleteTeam = async () => {
    if (teamToDelete && canManageTeams) {
      try {
        await deleteTeam(teamToDelete.id);
      } catch (error) {
        console.error("Failed to delete team:", error);
      } finally {
          setTeamToDelete(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card p-4 rounded-lg shadow">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

   if (!canManageTeams) {
      return (
        <div className="p-4 md:p-6 lg:p-8 text-center">
          <Icons.Warning className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to manage teams.</p>
        </div>
      );
  }


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Manage Teams</h1>
        {canManageTeams && (
          <Button onClick={handleOpenCreateDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Icons.AddTeam className="mr-2 h-5 w-5" /> Create Team
          </Button>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 p-8 text-center border border-dashed rounded-lg">
          <Icons.Team className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Teams Yet</h2>
          <p className="text-muted-foreground">Click the "Create Team" button to get started.</p>
        </div>
      ) : (
        <TeamList
          teams={teams.sort((a,b) => (a.createdAt?.getTime() ?? 0) > (b.createdAt?.getTime() ?? 0) ? -1 : 1)}
          users={users}
          onEditTeam={handleOpenEditDialog}
          onDeleteTeam={(teamId) => {
            const team = teams.find(t => t.id === teamId);
            if (team) handleDeleteConfirmation(team);
          }}
        />
      )}

      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team
              <span className="font-semibold"> "{teamToDelete?.name}"</span>.
              Users in this team will become unassigned. Tasks assigned to this team will have the assignment removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTeamToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
