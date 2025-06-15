
'use client';

import type { User, Team } from '@/types';
import { UserListItem } from './user-list-item';

interface UserListProps {
  users: User[];
  teams: Team[];
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

export function UserList({ users, teams, onEditUser, onDeleteUser }: UserListProps) {
  if (!users || users.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No users found. Get started by creating one!</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {users.map((user) => {
        const team = teams.find(t => t.id === user.teamId);
        return (
          <UserListItem
            key={user.id}
            user={user}
            team={team}
            onEdit={onEditUser}
            onDelete={onDeleteUser}
          />
        );
      })}
    </div>
  );
}
