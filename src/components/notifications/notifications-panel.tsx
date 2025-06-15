
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification, User } from '@/types';
import { NotificationItem } from './notification-item';
import { Icons } from '../icons';

interface NotificationsPanelProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  notifications: Notification[];
  users: User[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationsPanel({
  isOpen,
  onOpenChange,
  notifications,
  users,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col" side="right">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-xl font-semibold">Notifications</SheetTitle>
          {unreadCount > 0 && (
            <SheetDescription>
              You have {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}.
            </SheetDescription>
          )}
        </SheetHeader>
        <ScrollArea className="flex-grow">
          <div className="p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <Icons.Bell className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No notifications yet.</p>
                <p className="text-xs text-muted-foreground">Important updates will appear here.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  users={users}
                  onMarkAsRead={onMarkAsRead}
                />
              ))
            )}
          </div>
        </ScrollArea>
        {notifications.length > 0 && unreadCount > 0 && (
          <SheetFooter className="p-4 border-t">
            <Button variant="outline" onClick={onMarkAllAsRead} className="w-full">
              Mark All as Read
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
