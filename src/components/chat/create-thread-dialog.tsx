
'use client';

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { chatThreadFormSchema, type ChatThreadFormValues } from '@/lib/schemas';
import { useAppData } from '@/contexts/app-data-context';

interface CreateThreadDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onThreadSubmit: (threadData: ChatThreadFormValues) => void;
  channelId: string;
}

export function CreateThreadDialog({
  isOpen,
  onOpenChange,
  onThreadSubmit,
  channelId,
}: CreateThreadDialogProps) {
  const { chatChannels } = useAppData();
  const channel = chatChannels.find(c => c.id === channelId);

  const form = useForm<ChatThreadFormValues>({
    resolver: zodResolver(chatThreadFormSchema),
    defaultValues: {
      title: '',
      initialMessage: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: '',
        initialMessage: '',
      });
    }
  }, [isOpen, form]);

  const onSubmit = (values: ChatThreadFormValues) => {
    onThreadSubmit(values);
    onOpenChange(false);
  };

  if (!channel && isOpen) return null; // Should not happen if channelId is always valid

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) { 
        form.reset();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Start New Discussion
          </DialogTitle>
          <DialogDescription>
            Create a new discussion topic in #{channel?.name.replace(/^#/, '') || 'this channel'}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discussion Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ideas for new feature" {...field} className="text-base"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="initialMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your First Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Start the conversation..."
                      rows={5}
                      {...field}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Icons.Add className="mr-2 h-4 w-4" />
                Start Discussion
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
