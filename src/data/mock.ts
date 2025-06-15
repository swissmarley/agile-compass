
import type { User, Task, Project, Sprint, Team, ChatChannel, ChatMessage, ChatThread } from '@/types';
import { DEFAULT_ISSUE_TYPE } from '@/config/site';

export const mockUsers: User[] = [
  { id: 'user1', name: 'Alice Wonderland', avatar: 'https://picsum.photos/seed/user1/40/40', teamId: 'team1', createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
  { id: 'user2', name: 'Bob The Builder', avatar: 'https://picsum.photos/seed/user2/40/40', teamId: 'team1', createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
  { id: 'user3', name: 'Charlie Chaplin', avatar: 'https://picsum.photos/seed/user3/40/40', teamId: 'team2', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
  { id: 'user4', name: 'Diana Prince', avatar: 'https://picsum.photos/seed/user4/40/40', teamId: null, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
];

export const mockTeams: Team[] = [
  {
    id: 'team1',
    name: 'Frontend Wizards',
    description: 'Dedicated to crafting beautiful user interfaces.',
    memberIds: ['user1', 'user2'],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'team2',
    name: 'Backend Heroes',
    description: 'Masters of APIs and database performance.',
    memberIds: ['user3'],
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  },
];

export const mockProjects: Project[] = [
  {
    id: 'project1',
    name: 'Website Redesign',
    description: 'Complete overhaul of the company website.',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'project2',
    name: 'Mobile App Development',
    description: 'Develop a new cross-platform mobile application.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'project3',
    name: 'API Integration',
    description: 'Integrate with third-party APIs for enhanced functionality.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  }
];

export const mockSprints: Sprint[] = [
  {
    id: 'sprint1-project1',
    name: 'Sprint 1 - Foundation',
    goal: 'Lay the foundational structure for the website redesign.',
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), 
    endDate: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000),   
    status: 'completed',
    projectId: 'project1',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    retrospectiveNotes: "The team collaborated well on setting up the basic project structure. Communication was clear. \nNext time, we should allocate more time for initial environment configuration to avoid minor delays.",
  },
  {
    id: 'sprint2-project1',
    name: 'Sprint 2 - Core Features',
    goal: 'Implement core user-facing features.',
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), 
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),  
    status: 'active',
    projectId: 'project1',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    retrospectiveNotes: undefined,
  },
  {
    id: 'sprint1-project2',
    name: 'Sprint Alpha - Setup & Auth',
    goal: 'Basic project setup and authentication flow for mobile app.',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  
    status: 'active',
    projectId: 'project2',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    retrospectiveNotes: undefined,
  },
    {
    id: 'sprint3-project1',
    name: 'Sprint 3 - UI Polish',
    goal: 'Refine UI and prepare for testing.',
    startDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), 
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),  
    status: 'planned',
    projectId: 'project1',
    createdAt: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000), 
    retrospectiveNotes: undefined,
  },
];


export const mockTasks: Task[] = [
  {
    id: 'task1',
    title: 'Setup project repository',
    description: 'Initialize git, create README, and push to remote.',
    status: 'done',
    issueType: 'task',
    assignedUserIds: ['user1'],
    assignedTeamIds: ['team1'],
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 
    subtasks: ['Initialize git', 'Create README.md', 'Push initial commit'],
    storyPoints: 3,
    sprintId: 'sprint1-project1',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    projectId: 'project1',
  },
  {
    id: 'task2',
    title: 'Design database schema',
    description: 'Define tables, relationships, and data types for the application.',
    status: 'inprogress',
    issueType: 'story',
    assignedUserIds: ['user2', 'user3'],
    assignedTeamIds: ['team2'],
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 
    storyPoints: 5,
    sprintId: 'sprint1-project2',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    projectId: 'project2',
  },
  {
    id: 'task3',
    title: 'Implement authentication module',
    description: 'Develop user login, registration, and session management.',
    status: 'todo',
    issueType: 'epic',
    assignedUserIds: ['user3'],
    assignedTeamIds: [],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
    storyPoints: 8,
    sprintId: 'sprint2-project1',
    createdAt: new Date(),
    projectId: 'project1',
  },
  {
    id: 'task4',
    title: 'Develop Kanban UI',
    description: 'Create draggable task cards and columns.',
    status: 'todo',
    issueType: 'task',
    assignedUserIds: ['user1'],
    assignedTeamIds: ['team1'],
    storyPoints: 5,
    sprintId: 'sprint2-project1',
    createdAt: new Date(),
    projectId: 'project1',
  },
  {
    id: 'task5',
    title: 'User Profile Page Bug',
    description: 'Profile image not updating correctly on mobile.',
    status: 'inprogress',
    issueType: 'bug',
    assignedUserIds: ['user1'],
    assignedTeamIds: [],
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    storyPoints: 3,
    sprintId: 'sprint1-project2',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    projectId: 'project2',
  },
  {
    id: 'task6',
    title: 'Payment Gateway Setup',
    description: 'Configure Stripe for payment processing.',
    status: 'todo',
    issueType: 'feature_request',
    assignedUserIds: ['user2'],
    assignedTeamIds: [],
    storyPoints: 8,
    sprintId: null, 
    createdAt: new Date(),
    projectId: 'project3',
  },
  {
    id: 'task7',
    title: 'Define API endpoints for user service',
    description: 'List all required endpoints, request/response formats.',
    status: 'backlog',
    issueType: 'subtask',
    assignedUserIds: ['user1'],
    assignedTeamIds: [],
    storyPoints: 2,
    sprintId: null,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    projectId: 'project1',
  },
  {
    id: 'task8',
    title: 'Research React Native vs Flutter',
    description: 'Comparative analysis for mobile app framework selection.',
    status: 'backlog',
    issueType: DEFAULT_ISSUE_TYPE,
    assignedUserIds: [], 
    assignedTeamIds: [],
    storyPoints: 3,
    sprintId: null,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    projectId: 'project2',
  },
  {
    id: 'task9',
    title: 'Marketing strategy for Q3',
    description: 'Plan marketing activities, budget, and KPIs for the third quarter.',
    status: 'backlog',
    issueType: 'epic',
    assignedUserIds: ['user3', 'user4'],
    assignedTeamIds: ['team2'],
    storyPoints: 5,
    sprintId: null,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    projectId: 'project1',
  }
];

export const mockChatChannels: ChatChannel[] = [
  {
    id: 'general',
    name: '#general',
    description: 'General announcements and discussions for everyone.',
    type: 'general',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'project1-chat',
    name: '#website-redesign',
    description: 'Discussions related to the Website Redesign project.',
    type: 'project',
    entityId: 'project1',
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'sprint2-project1-chat',
    name: '#sprint2-core-features',
    description: 'Chat for Sprint 2 - Core Features (Website Redesign)',
    type: 'sprint',
    entityId: 'sprint2-project1',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

export const mockChatThreads: ChatThread[] = [
  {
    id: 'thread1-general',
    channelId: 'general',
    title: 'Welcome to TaskMaster!',
    createdByUserId: 'user1',
    createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    lastMessageAt: new Date(Date.now() - 29 * 24 * 60 * 59 * 1000),
    messageCount: 2,
  },
  {
    id: 'thread1-project1',
    channelId: 'project1-chat',
    title: 'Homepage Wireframe Discussion',
    createdByUserId: 'user1',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    lastMessageAt: new Date(Date.now() - 8 * 24 * 60 * 58 * 1000),
    messageCount: 2,
  },
  {
    id: 'thread1-sprint2-project1',
    channelId: 'sprint2-project1-chat',
    title: 'Sprint 2 Kick-off & Auth Module Updates',
    createdByUserId: 'user1',
    createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    lastMessageAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
    messageCount: 2,
  }
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg1',
    threadId: 'thread1-general', // Link to thread
    userId: 'user1', // Alice
    content: 'Hello everyone! Welcome to TaskMaster!',
    createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'msg2',
    threadId: 'thread1-general', // Link to thread
    userId: 'user2', // Bob
    content: 'Hi Alice! Glad to be here.',
    createdAt: new Date(Date.now() - 29 * 24 * 60 * 59 * 1000),
  },
  {
    id: 'msg3',
    threadId: 'thread1-project1', // Link to thread
    userId: 'user1', // Alice
    content: 'Let\'s start discussing the wireframes for the homepage.',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'msg4',
    threadId: 'thread1-project1', // Link to thread
    userId: 'user2', // Bob
    content: 'Sure, I have some initial sketches ready.',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 58 * 1000),
  },
  {
    id: 'msg5',
    threadId: 'thread1-sprint2-project1', // Link to thread
    userId: 'user1',
    content: 'Kick-off for Sprint 2! Let\'s get the core features rolling.',
    createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
  },
  {
    id: 'msg6',
    threadId: 'thread1-sprint2-project1', // Link to thread
    userId: 'user3',
    content: 'I\'m on the authentication module. Will post updates here.',
    createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
  },
];
