
'use client';

import type { Dispatch, SetStateAction } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { sprintRetrospectiveSchema, type SprintRetrospectiveFormValues } from '@/lib/schemas';
import type { Sprint } from '@/types';

interface SprintRetrospectiveDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  sprint: Sprint | null;
  onSubmitRetrospective: (sprintId: string, notes: string) => void;
}

export function SprintRetrospectiveDialog({
  isOpen,
  onOpenChange,
  sprint,
  onSubmitRetrospective,
}: SprintRetrospectiveDialogProps) {
  const form = useForm<SprintRetrospectiveFormValues>({
    resolver: zodResolver(sprintRetrospectiveSchema),
    defaultValues: {
      notes: sprint?.retrospectiveNotes || '',
    },
  });

  if (!sprint) return null;

  const onSubmit = (values: SprintRetrospectiveFormValues) => {
    onSubmitRetrospective(sprint.id, values.notes);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        form.reset({ notes: sprint?.retrospectiveNotes || '' });
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Sprint Retrospective: {sprint.name}
          </DialogTitle>
          <DialogDescription>
            Reflect on the sprint. What went well? What could be improved?
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retrospective Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your thoughts on the sprint experience, methods, and potential improvements..."
                      rows={8}
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
                <Icons.Success className="mr-2 h-4 w-4" />
                Save Retrospective
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
