
'use client';

import type { Team, User } from '@/types';
import { TeamListItem } from './team-list-item';

interface TeamListProps {
  teams: Team[];
  users: User[]; // To resolve members for each team
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
}

export function TeamList({ teams, users, onEditTeam, onDeleteTeam }: TeamListProps) {
  if (!teams || teams.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No teams found. Get started by creating one!</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((team) => {
        const teamMembers = users.filter(user => team.memberIds.includes(user.id));
        return (
          <TeamListItem
            key={team.id}
            team={team}
            members={teamMembers}
            onEdit={onEditTeam}
            onDelete={onDeleteTeam}
          />
        );
      })}
    </div>
  );
}
