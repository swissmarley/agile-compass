
'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { Project } from '@/types';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// Helper to convert Timestamp to Date safely
const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

interface ProjectListItemProps {
  project: Project;
  onRename: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export function ProjectListItem({ project, onRename, onDelete }: ProjectListItemProps) {
  const createdAtDate = tsToDate(project.createdAt);

  return (
    <Card
      className="shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg border"
      aria-label={`Project: ${project.name}`}
    >
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold leading-tight flex-grow">
            {project.name}
          </CardTitle>
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onRename(project); }}
              aria-label="Rename project"
              className="h-8 w-8"
            >
              <Icons.Rename className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              aria-label="Delete project"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Icons.Delete className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {project.description && (
          <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-3">
            {project.description}
          </CardDescription>
        )}
         {createdAtDate && (
            <div className="text-xs text-muted-foreground mt-3">
              Created: {format(createdAtDate, 'MMM dd, yyyy')}
            </div>
         )}
      </CardContent>
    </Card>
  );
}
