
import { z } from 'zod';
import { ISSUE_TYPES, DEFAULT_ISSUE_TYPE } from '@/config/site';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import type { Role } from '@/types';

const issueTypeIds = ISSUE_TYPES.map(it => it.id) as [string, ...string[]];

// Helper to safely convert date strings/Dates to Timestamps or keep undefined
const dateToTimestamp = (date: Date | string | undefined): Timestamp | undefined => {
  if (!date) return undefined;
  try {
    return Timestamp.fromDate(new Date(date));
  } catch (e) {
    return undefined; // Handle invalid date formats if necessary
  }
};

export const taskFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }).max(100),
  description: z.string().max(1000).optional().or(z.literal('')),
  assignedUserIds: z.array(z.string()).optional(),
  assignedTeamIds: z.array(z.string()).optional(),
  dueDate: z.date().optional(), // Keep as Date for form input, convert before saving
  subtasks: z.string().optional(),
  projectId: z.string().optional(),
  storyPoints: z.number().min(0, "Story points must be non-negative").optional().nullable(),
  sprintId: z.string().nullable().optional(),
  issueType: z.enum(issueTypeIds).default(DEFAULT_ISSUE_TYPE),
  parentStoryId: z.string().optional().nullable(),
  epicId: z.string().optional().nullable(), // This epicId is for stories linking to an epic
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;


export const projectFormSchema = z.object({
  name: z.string().min(3, { message: 'Project name must be at least 3 characters long.' }).max(50),
  description: z.string().max(500).optional().or(z.literal('')),
  allowedUserIds: z.array(z.string()).optional(),
  allowedTeamIds: z.array(z.string()).optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const sprintFormSchema = z.object({
  name: z.string().min(3, { message: "Sprint name must be at least 3 characters." }).max(50),
  goal: z.string().max(255).optional().or(z.literal('')),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  epicId: z.string().optional().nullable(), // Added epicId for associating Sprint with an Epic
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

export type SprintFormValues = z.infer<typeof sprintFormSchema>;


export const teamFormSchema = z.object({
  name: z.string().min(3, { message: 'Team name must be at least 3 characters long.' }).max(50),
  description: z.string().max(500).optional().or(z.literal('')),
  // memberIds are managed separately when assigning users
});

export type TeamFormValues = z.infer<typeof teamFormSchema>;

const ROLES: [Role, ...Role[]] = ['User', 'Supervisor', 'Manager', 'Administrator'];

export const userFormSchema = z.object({
  id: z.string().min(1, "Firebase Auth UID is required."), // UID from Firebase Auth
  name: z.string().min(2, { message: 'User name must be at least 2 characters long.' }).max(50),
  avatar: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  teamId: z.string().nullable().optional(),
  role: z.enum(ROLES).default('User'),
});

export type UserFormValues = z.infer<typeof userFormSchema>;


export const sprintRetrospectiveSchema = z.object({
  notes: z.string().min(10, { message: "Please provide some details for the retrospective (min 10 characters)." }).max(5000, { message: "Retrospective notes cannot exceed 5000 characters." }),
});
export type SprintRetrospectiveFormValues = z.infer<typeof sprintRetrospectiveSchema>;


export const chatChannelFormSchema = z.object({
  name: z.string().min(2, { message: "Channel name must be at least 2 characters."}).max(50, { message: "Channel name cannot exceed 50 characters."}).regex(/^[a-zA-Z0-9-_]+$/, { message: "Channel name can only contain letters, numbers, hyphens, and underscores."}),
  description: z.string().max(255).optional().or(z.literal('')),
});
export type ChatChannelFormValues = z.infer<typeof chatChannelFormSchema>;


export const chatThreadFormSchema = z.object({
  title: z.string().min(3, { message: "Thread title must be at least 3 characters." }).max(150, { message: "Thread title cannot exceed 150 characters." }),
  initialMessage: z.string().min(1, { message: "An initial message is required to start a thread." }).max(2000, { message: "Message cannot exceed 2000 characters." }),
});
export type ChatThreadFormValues = z.infer<typeof chatThreadFormSchema>;
