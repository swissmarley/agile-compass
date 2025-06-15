
'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { Notification, User, NotificationType } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface NotificationItemProps {
  notification: Notification;
  users: User[];
  onMarkAsRead: (notificationId: string) => void;
}

const getIconForNotificationType = (type: NotificationType): React.ElementType => {
  switch (type) {
    case 'project_created': return Icons.Project;
    case 'task_created':
    case 'task_assigned':
    case 'task_moved_from_backlog':
    case 'task_status_changed': return Icons.ListChecks;
    case 'sprint_started':
    case 'sprint_finished': return Icons.Sprint;
    case 'new_chat_message': return Icons.Chat;
    default: return Icons.Info;
  }
};

export function NotificationItem({ notification, users, onMarkAsRead }: NotificationItemProps) {
  const actor = notification.actorUserId ? users.find(u => u.id === notification.actorUserId) : null;
  const IconComponent = getIconForNotificationType(notification.type);
  const createdAtDate = notification.createdAt instanceof Date ? notification.createdAt : notification.createdAt.toDate();

  return (
    <Card className={cn("shadow-sm border rounded-lg overflow-hidden", !notification.isRead && "bg-primary/5 border-primary/30")}>
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 pt-1">
            {actor?.avatar ? (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={actor.avatar} alt={actor.name} data-ai-hint="person user" />
                    <AvatarFallback>{actor.name.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
            ) : (
                <IconComponent className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">{notification.title}</CardTitle>
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="text-xs h-auto p-1 text-primary hover:text-primary/80"
                  title="Mark as read"
                >
                  Mark Read
                </Button>
              )}
            </div>
            {notification.message && (
              <CardDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </CardDescription>
            )}
            <div className="text-xs text-muted-foreground mt-1.5 flex justify-between items-center">
              <span>{formatDistanceToNow(createdAtDate, { addSuffix: true })}</span>
              {notification.link && (
                <Link href={notification.link} passHref legacyBehavior>
                  <a
                    onClick={() => { if (!notification.isRead) onMarkAsRead(notification.id);}}
                    className="text-xs text-primary hover:underline"
                  >
                    View Details
                  </a>
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
