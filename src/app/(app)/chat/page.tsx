
'use client';

import { ChatInterface } from '@/components/chat/chat-interface';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppData } from '@/contexts/app-data-context';
import { Icons } from '@/components/icons';

export default function ChatPage() {
  // isLoading reflects Firestore loading state
  const { isLoading, users, chatChannels } = useAppData();

  // Show skeleton while initial data is loading
  if (isLoading) {
    return (
      <div className="flex h-full">
        {/* Sidebar Skeleton */}
        <div className="w-56 md:w-64 border-r p-4 space-y-2 hidden md:block bg-muted/30">
          <Skeleton className="h-8 w-3/4 mb-4" />
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        {/* Main Chat Area Skeleton */}
        <div className="flex-1 p-4 flex flex-col">
          <Skeleton className="h-12 w-full mb-4" /> {/* Header Skeleton */}
          <div className="flex-grow space-y-3"> {/* Messages Skeleton */}
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)} {/* Generic skeleton for thread list or messages */}
          </div>
          <Skeleton className="h-12 w-full mt-4" /> {/* Input Skeleton */}
        </div>
      </div>
    );
  }

  // Render the actual chat interface once data is loaded
  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,4rem)-1px)]">
      <ChatInterface />
    </div>
  );
}
