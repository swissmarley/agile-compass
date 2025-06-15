
import { Timestamp } from 'firebase/firestore';

export type KanbanStatus = string; // Changed to string for dynamic column IDs

export type SprintStatus = 'planned' | 'active' | 'completed';

export type IssueType = 'task' | 'story' | 'bug' | 'epic' | 'subtask' | 'feature_request';

export type ChatChannelType = 'general' | 'project' | 'sprint' | 'task' | 'dm';

export type Role = 'User' | 'Supervisor' | 'Manager' | 'Administrator';

// Using Timestamp for date fields for Firestore compatibility
// Conversion to Date object will happen in the application logic where needed

export interface User {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  avatar?: string; // URL to avatar image
  teamId?: string | null; // User can belong to a team
  createdAt: Timestamp;
  role: Role;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: Timestamp;
}

export interface ProjectBoardColumn {
  id: string;
  title: string;
  // order?: number; // Consider adding for explicit ordering if needed later
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  boardColumns?: ProjectBoardColumn[];
  allowedUserIds?: string[]; // Added for project access control
  allowedTeamIds?: string[]; // Added for project access control
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: SprintStatus;
  projectId: string;
  epicId?: string | null; // Added field to link Sprint to an Epic
  createdAt: Timestamp;
  retrospectiveNotes?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: KanbanStatus; // Now a string, refers to ProjectBoardColumn.id or BACKLOG_STATUS_ID
  issueType: IssueType;
  assignedUserIds?: string[];
  assignedTeamIds?: string[];
  dueDate?: Timestamp;
  subtasks?: string[];
  storyPoints?: number;
  sprintId?: string | null;
  createdAt: Timestamp;
  projectId?: string;
  parentStoryId?: string | null; // Link to parent story for tasks, bugs, etc.
  epicId?: string | null; // Link to parent epic for stories
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: ChatChannelType;
  entityId?: string;
  createdAt: Timestamp;
}

export interface ChatThread {
  id: string;
  channelId: string;
  title: string;
  createdByUserId: string;
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
}

export type NotificationType =
  | 'project_created'
  | 'task_created'
  | 'task_assigned'
  | 'task_moved_from_backlog'
  | 'task_status_changed'
  | 'sprint_started'
  | 'sprint_finished'
  | 'new_chat_message'
  | 'generic';

export interface Notification {
  id: string;
  recipientUserId: string;
  actorUserId?: string; // User who performed the action
  type: NotificationType;
  title: string;
  message?: string;
  entityId?: string; // ID of the related task, project, etc.
  entityType?: 'task' | 'project' | 'sprint' | 'thread' | 'general';
  isRead: boolean;
  createdAt: Timestamp;
  link?: string; // Optional direct link
}
