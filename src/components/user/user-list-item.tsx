
'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { User, Team } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// Helper to convert Timestamp to Date safely
const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

interface UserListItemProps {
  user: User;
  team?: Team | null;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

export function UserListItem({ user, team, onEdit, onDelete }: UserListItemProps) {
  const createdAtDate = tsToDate(user.createdAt);

  return (
    <Card
      className="shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg border"
      aria-label={`User: ${user.name}`}
    >
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center flex-grow">
            <Avatar className="h-10 w-10 mr-3">
              {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait"/> : null}
              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold leading-tight flex items-center">
                {user.name}
                {user.isAdmin && <Icons.Sparkles className="ml-2 h-4 w-4 text-primary" title="Administrator"/>} {/* Indicate Admin */}
              </CardTitle>
              {team && <Badge variant="secondary" className="mt-1 text-xs">{team.name}</Badge>}
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="ghost" size="icon" onClick={() => onEdit(user)}
              aria-label="Edit user" className="h-8 w-8"
            >
              <Icons.Edit className="h-4 w-4" />
            </Button>
            {/* Maybe disable delete for admins or self? Handled in page */}
            <Button
              variant="ghost" size="icon" onClick={() => onDelete(user.id)}
              aria-label="Delete user" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Icons.Delete className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {createdAtDate && (
             <div className="text-xs text-muted-foreground">
                Joined: {format(createdAtDate, 'MMM dd, yyyy')}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
