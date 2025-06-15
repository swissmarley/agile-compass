
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import type { ChatChannel, ChatMessage, User, ChatThread } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';


// Helper to convert Timestamp to Date safely
const tsToDate = (ts: Timestamp | Date | undefined): Date | null => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}


const ChannelListItem = ({ channel, onSelectChannel, isActive }: { channel: ChatChannel, onSelectChannel: (channelId: string) => void, isActive: boolean }) => {
  const { projects, sprints, tasks } = useAppData();
  let displayName = channel.name;
  let displayIcon = <Icons.Chat className="h-4 w-4 mr-2 text-muted-foreground" />;

  if (channel.type === 'project' && channel.entityId) {
    const project = projects.find(p => p.id === channel.entityId);
    displayName = project ? `# ${project.name}` : channel.name;
    displayIcon = <Icons.Project className="h-4 w-4 mr-2 text-muted-foreground" />;
  } else if (channel.type === 'sprint' && channel.entityId) {
    const sprint = sprints.find(s => s.id === channel.entityId);
    displayName = sprint ? `# ${sprint.name}` : channel.name;
    displayIcon = <Icons.Sprint className="h-4 w-4 mr-2 text-muted-foreground" />;
  } else if (channel.type === 'task' && channel.entityId) {
    const task = tasks.find(t => t.id === channel.entityId);
    displayName = task ? `# ${task.title.substring(0,20)}...` : channel.name;
    displayIcon = <Icons.ListChecks className="h-4 w-4 mr-2 text-muted-foreground" />;
  }

  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className="w-full justify-start px-2 py-1.5 h-auto text-sm"
      onClick={() => onSelectChannel(channel.id)}
    >
      {displayIcon}
      <span className="truncate flex-grow">{displayName}</span>
    </Button>
  );
};

const ThreadListItem = ({ thread, onSelectThread, isActive, users }: { thread: ChatThread, onSelectThread: (threadId: string) => void, isActive: boolean, users: User[] }) => {
  const createdByUser = users.find(u => u.id === thread.createdByUserId);
  const createdAtDate = tsToDate(thread.createdAt);
  const lastMessageAtDate = tsToDate(thread.lastMessageAt);

  return (
    <Button
      variant={isActive ? "ghost" : "outline"}
      className={cn("w-full justify-start p-3 h-auto mb-2 text-left flex flex-col items-start shadow-sm", isActive && "bg-primary/10 border-primary")}
      onClick={() => onSelectThread(thread.id)}
    >
      <div className="flex justify-between w-full items-center">
        <h4 className="font-semibold text-sm truncate flex-grow pr-2">{thread.title}</h4>
        <Badge variant="outline" className="text-xs whitespace-nowrap">{thread.messageCount} msg</Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Started by {createdByUser?.name || 'Unknown User'} - {createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : '...'}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Last activity: {lastMessageAtDate ? formatDistanceToNow(lastMessageAtDate, { addSuffix: true }) : '...'}
      </p>
    </Button>
  );
};


const MessageListItem = ({ message, user, isOwnMessage }: { message: ChatMessage, user: User | undefined, isOwnMessage: boolean }) => {
  const createdAtDate = tsToDate(message.createdAt);

  return (
    <div className={cn("flex mb-3 items-start", isOwnMessage ? "justify-end" : "justify-start")}>
      {!isOwnMessage && user && (
        <Avatar className="h-8 w-8 mr-2 shrink-0">
          {user.avatar && <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person" />}
          <AvatarFallback>{user.name.substring(0,1).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
          "max-w-[70%] p-2.5 rounded-lg shadow-sm",
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {!isOwnMessage && user && <p className="text-xs font-semibold mb-0.5">{user.name}</p>}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
         {createdAtDate && (
             <p className={cn(
                "text-xs mt-1 opacity-70",
                isOwnMessage ? "text-right" : "text-left"
              )}
              title={format(createdAtDate, "PPP p")}
            >
                {formatDistanceToNow(createdAtDate, { addSuffix: true })}
            </p>
         )}
      </div>
      {isOwnMessage && user && (
         <Avatar className="h-8 w-8 ml-2 shrink-0">
          {user.avatar && <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person" />}
          <AvatarFallback>{user.name.substring(0,1).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};


export function ChatInterface() {
  const { user: authUser, appUser: currentUserInfo } = useAuth();
  const {
    chatChannels, chatThreads, chatMessages, users, addChatMessage,
    openCreateChannelDialog, openCreateThreadDialog,
    isLoading, projects, sprints, tasks
  } = useAppData();

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = authUser?.uid;
  const canCreateChannel = currentUserInfo?.role === 'Administrator' || currentUserInfo?.role === 'Manager' || currentUserInfo?.role === 'Supervisor';


  useEffect(() => {
    if (!selectedChannelId && chatChannels.length > 0) {
        const generalChannel = chatChannels.find(c => c.id === 'general') || chatChannels[0];
        setSelectedChannelId(generalChannel.id);
    }
  }, [chatChannels, selectedChannelId]);

  useEffect(() => {
    setSelectedThreadId(null);
  }, [selectedChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedThreadId]);


  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && selectedThreadId && currentUserId) {
      const contentToSend = messageInput.trim();
      setMessageInput('');
      try {
        await addChatMessage(selectedThreadId, contentToSend, currentUserId);
      } catch (error) {
          console.error("Failed to send message:", error);
          setMessageInput(contentToSend);
      }
    }
  };

  const selectedChannel = chatChannels.find(c => c.id === selectedChannelId);
  const threadsForSelectedChannel = useMemo(() => {
    if (!selectedChannelId) return [];
    return chatThreads.filter(thread => thread.channelId === selectedChannelId);
  }, [chatThreads, selectedChannelId]);

  const selectedThread = chatThreads.find(t => t.id === selectedThreadId);
  const messagesForSelectedThread = useMemo(() => {
    if (!selectedThreadId) return [];
    return chatMessages.filter(msg => msg.threadId === selectedThreadId);
  }, [chatMessages, selectedThreadId]);


  let channelDisplayName = selectedChannel?.name;
    if (selectedChannel?.type === 'project' && selectedChannel.entityId) {
        const project = projects.find(p => p.id === selectedChannel.entityId);
        channelDisplayName = project ? `# ${project.name}` : selectedChannel.name;
    } else if (selectedChannel?.type === 'sprint' && selectedChannel.entityId) {
        const sprint = sprints.find(s => s.id === selectedChannel.entityId);
        channelDisplayName = sprint ? `# ${sprint.name}` : selectedChannel.name;
    } else if (selectedChannel?.type === 'task' && selectedChannel.entityId) {
        const task = tasks.find(t => t.id === selectedChannel.entityId);
        channelDisplayName = task ? `# ${task.title.substring(0, 20)}...` : selectedChannel.name;
    }


  if (isLoading) {
    return (
      <div className="flex h-full p-4">
        <div className="w-56 md:w-64 border-r pr-4 space-y-2 hidden md:block bg-muted/30">
          <Skeleton className="h-8 w-3/4 mb-4" />
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="flex-1 pl-4 flex flex-col">
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-10 w-1/3 mb-4" />
          <div className="flex-grow space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
          <Skeleton className="h-12 w-full mt-4" />
        </div>
      </div>
    )
  }


  return (
    <div className="flex h-full border rounded-lg shadow-sm bg-card">
      <div className="w-56 md:w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <h2 className="text-lg font-semibold">Channels</h2>
        </div>
        <ScrollArea className="flex-grow p-2">
          {chatChannels.length === 0 && <p className="text-sm text-muted-foreground p-2">No channels yet.</p>}
          {chatChannels.map(channel => (
            <ChannelListItem
              key={channel.id}
              channel={channel}
              onSelectChannel={handleSelectChannel}
              isActive={selectedChannelId === channel.id}
            />
          ))}
        </ScrollArea>
        {openCreateChannelDialog && canCreateChannel && (
            <div className="p-2 border-t">
                <Button variant="outline" className="w-full" onClick={openCreateChannelDialog}>
                    <Icons.Add className="mr-2 h-4 w-4" /> New Channel
                </Button>
            </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedChannelId ? (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                    <Icons.Chat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Select a channel</h3>
                    <p className="text-muted-foreground">Choose a channel from the left to start chatting.</p>
                </div>
            </div>
        ) : !selectedThreadId ? (
            <>
                <header className="p-3 border-b flex items-center justify-between bg-background">
                    <div>
                        <h3 className="text-lg font-semibold">{channelDisplayName || selectedChannel?.name}</h3>
                        {selectedChannel?.description && <p className="text-xs text-muted-foreground">{selectedChannel.description}</p>}
                    </div>
                    {openCreateThreadDialog && selectedChannelId && ( // All authenticated users can create threads
                        <Button onClick={() => openCreateThreadDialog(selectedChannelId)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Icons.MessageSquarePlus className="mr-2 h-4 w-4" /> Start New Discussion
                        </Button>
                    )}
                </header>
                <ScrollArea className="flex-grow p-4 bg-background/50">
                    {threadsForSelectedChannel.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No discussions in this channel yet. Start one!</p>
                        </div>
                    ) : (
                        threadsForSelectedChannel.map(thread => (
                            <ThreadListItem
                                key={thread.id}
                                thread={thread}
                                onSelectThread={handleSelectThread}
                                isActive={selectedThreadId === thread.id}
                                users={users}
                            />
                        ))
                    )}
                </ScrollArea>
            </>
        ) : (
            <>
                <header className="p-3 border-b flex items-center justify-between bg-background">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedThreadId(null)} className="mb-1 -ml-2">
                            <Icons.ChevronLeft className="mr-1 h-4 w-4"/> Back to {channelDisplayName || selectedChannel?.name}
                        </Button>
                        <h3 className="text-lg font-semibold">{selectedThread?.title}</h3>
                    </div>
                </header>
                <ScrollArea className="flex-grow p-4 bg-background/50">
                    {messagesForSelectedThread.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No messages in this discussion yet.</p>
                        </div>
                    )}
                    {messagesForSelectedThread.map(msg => {
                        const user = users.find(u => u.id === msg.userId);
                        return <MessageListItem key={msg.id} message={msg} user={user} isOwnMessage={msg.userId === currentUserId}/>;
                    })}
                    <div ref={messagesEndRef} />
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="p-3 border-t bg-background">
                    <div className="flex items-center gap-2">
                        <Input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder={`Reply in "${selectedThread?.title ? selectedThread.title.substring(0,20) + '...' : ''}"`}
                            className="flex-grow"
                            aria-label="Message input"
                            disabled={!currentUserId}
                        />
                        <Button type="submit" disabled={!messageInput.trim() || !currentUserId} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Send <Icons.Edit3 className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </>
        )}
      </div>
    </div>
  );
}
