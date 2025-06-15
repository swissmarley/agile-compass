'use client';

import type { Project } from '@/types';
import { ProjectListItem } from './project-list-item';

interface ProjectListProps {
  projects: Project[];
  onRenameProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectList({ projects, onRenameProject, onDeleteProject }: ProjectListProps) {
  if (!projects || projects.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No projects found. Get started by creating one!</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectListItem
          key={project.id}
          project={project}
          onRename={onRenameProject}
          onDelete={onDeleteProject}
        />
      ))}
    </div>
  );
}
