
'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { Team, User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// Helper to convert Timestamp to Date safely
const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

interface TeamListItemProps {
  team: Team;
  members: User[];
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
}

export function TeamListItem({ team, members, onEdit, onDelete }: TeamListItemProps) {
  const createdAtDate = tsToDate(team.createdAt);

  return (
    <Card
      className="shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg border"
      aria-label={`Team: ${team.name}`}
    >
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold leading-tight flex-grow">
            {team.name}
          </CardTitle>
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onEdit(team); }}
              aria-label="Edit team"
              className="h-8 w-8"
            >
              <Icons.Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onDelete(team.id); }}
              aria-label="Delete team"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Icons.Delete className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {team.description && (
          <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {team.description}
          </CardDescription>
        )}
        <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Members ({members.length}):</p>
            {members.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    {members.slice(0, 5).map(member => (
                        <Avatar key={member.id} className="h-6 w-6 border-2 border-background" title={member.name}>
                            {member.avatar ? <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person" /> : null}
                            <AvatarFallback className="text-xs">{member.name.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    ))}
                    {members.length > 5 && <Badge variant="outline" className="text-xs">+{members.length - 5} more</Badge>}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">No members yet.</p>
            )}
        </div>
        {createdAtDate && (
            <div className="text-xs text-muted-foreground mt-3">
              Created: {format(createdAtDate, 'MMM dd, yyyy')}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
