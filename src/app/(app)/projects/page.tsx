
'use client';

import { useState } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectList } from '@/components/project/project-list';
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
import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';

export default function ProjectsPage() {
  const { appUser } = useAuth();
  const {
    projects,
    isLoading,
    deleteProject,
    openRenameProjectDialog,
    selectedProjectId,
    setSelectedProjectId
  } = useAppData();

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const canManageProjects = appUser?.role === 'Administrator' || appUser?.role === 'Manager';

  const handleOpenRenameDialog = (project: Project) => {
    if (openRenameProjectDialog && canManageProjects) {
      openRenameProjectDialog(project);
    } else if (!canManageProjects) {
        alert("You do not have permission to rename projects.");
    }
  };

  const handleDeleteConfirmation = (project: Project) => {
    if (canManageProjects) {
        setProjectToDelete(project);
    } else {
         alert("You do not have permission to delete projects.");
    }
  };

  const executeDeleteProject = async () => {
    if (projectToDelete && canManageProjects) {
      try {
         await deleteProject(projectToDelete.id);
      } catch (error) {
          console.error("Failed to delete project:", error);
          // Optionally show an error toast
      } finally {
          setProjectToDelete(null);
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
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!canManageProjects) {
      return (
        <div className="p-4 md:p-6 lg:p-8 text-center">
          <Icons.Warning className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to manage projects.</p>
        </div>
      );
  }


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Manage Projects</h1>
        {/* Add Project button is in AppHeader, visibility controlled by role */}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 p-8 text-center border border-dashed rounded-lg">
          <Icons.ProjectsPage className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
          <p className="text-muted-foreground">Click the "New Project" button in the header to get started.</p>
        </div>
      ) : (
        <ProjectList
          projects={projects.sort((a,b) => (a.createdAt?.getTime() ?? 0) > (b.createdAt?.getTime() ?? 0) ? -1 : 1)}
          onRenameProject={handleOpenRenameDialog}
          onDeleteProject={(projectId) => {
            const proj = projects.find(p => p.id === projectId);
            if (proj) handleDeleteConfirmation(proj);
          }}
        />
      )}

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              <span className="font-semibold"> "{projectToDelete?.name}"</span> and all its associated tasks, sprints, and chat channels.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
