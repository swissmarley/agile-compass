'use server';

/**
 * @fileOverview Task detail suggestion AI agent.
 *
 * - suggestTaskDetails - A function that suggests detailed task descriptions and subtasks based on a short task title.
 * - SuggestTaskDetailsInput - The input type for the suggestTaskDetails function.
 * - SuggestTaskDetailsOutput - The return type for the suggestTaskDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskDetailsInputSchema = z.object({
  title: z.string().describe('The short title of the task.'),
});
export type SuggestTaskDetailsInput = z.infer<typeof SuggestTaskDetailsInputSchema>;

const SuggestTaskDetailsOutputSchema = z.object({
  description: z.string().describe('A detailed description of the task.'),
  subtasks: z.array(z.string()).describe('A list of subtasks for the task.'),
});
export type SuggestTaskDetailsOutput = z.infer<typeof SuggestTaskDetailsOutputSchema>;

export async function suggestTaskDetails(input: SuggestTaskDetailsInput): Promise<SuggestTaskDetailsOutput> {
  return suggestTaskDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskDetailsPrompt',
  input: {schema: SuggestTaskDetailsInputSchema},
  output: {schema: SuggestTaskDetailsOutputSchema},
  prompt: `You are a task management expert. Given a short task title, you will generate a detailed task description and a list of subtasks.

Task Title: {{{title}}}

Description:
Subtasks:`, // Ensure the model knows what to generate
});

const suggestTaskDetailsFlow = ai.defineFlow(
  {
    name: 'suggestTaskDetailsFlow',
    inputSchema: SuggestTaskDetailsInputSchema,
    outputSchema: SuggestTaskDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
