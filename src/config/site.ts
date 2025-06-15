
import type { SprintStatus, IssueType, ProjectBoardColumn } from '@/types';
import type { IconName } from '@/components/icons';

export const siteConfig = {
  name: 'Agile Compass',
  description: 'Agile project management with Kanban boards, backlogs, roadmaps, and AI-powered features.',
};

// This now represents the *default* structure for new projects.
export const DEFAULT_KANBAN_BOARD_COLUMNS: ProjectBoardColumn[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'inprogress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

// ALL_TASK_STATUSES can serve as a fallback for titles if a custom column ID matches one of these.
// Or, it can be used for specific non-board statuses like 'backlog'.
export const ALL_TASK_STATUSES: { id: string; title: string, isBoardColumn: boolean }[] = [
  { id: 'backlog', title: 'Backlog', isBoardColumn: false },
  { id: 'todo', title: 'To Do', isBoardColumn: true }, // Title fallback if custom col id='todo'
  { id: 'inprogress', title: 'In Progress', isBoardColumn: true }, // Title fallback
  { id: 'done', title: 'Done', isBoardColumn: true }, // Title fallback
];

export const BACKLOG_STATUS_ID: string = 'backlog'; // Remains string

export const SPRINT_STATUSES: { id: SprintStatus; title: string }[] = [
  { id: 'planned', title: 'Planned' },
  { id: 'active', title: 'Active' },
  { id: 'completed', title: 'Completed' },
];

export const ISSUE_TYPES: { id: IssueType; title: string; icon: IconName }[] = [
  { id: 'task', title: 'Task', icon: 'IssueTask' },
  { id: 'story', title: 'Story', icon: 'IssueStory' },
  { id: 'bug', title: 'Bug', icon: 'IssueBug' },
  { id: 'epic', title: 'Epic', icon: 'IssueEpic' },
  { id: 'subtask', title: 'Sub-task', icon: 'IssueSubtask' },
  { id: 'feature_request', title: 'Feature Request', icon: 'IssueFeatureRequest' },
];

export const DEFAULT_ISSUE_TYPE: IssueType = 'task';
