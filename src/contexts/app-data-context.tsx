
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp, writeBatch, getDocs, orderBy, setDoc, getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task, Project, User as AppUserType, Sprint, SprintStatus, Team, ChatChannel, ChatChannelType, ChatThread, ChatMessage, ProjectBoardColumn, KanbanStatus, Notification, NotificationType, Role, IssueType } from '@/types';
import type { TaskFormValues, SprintFormValues as CreateSprintFormValues, ProjectFormValues, TeamFormValues, UserFormValues, ChatChannelFormValues, ChatThreadFormValues } from '@/lib/schemas';
import { DEFAULT_ISSUE_TYPE, BACKLOG_STATUS_ID, DEFAULT_KANBAN_BOARD_COLUMNS, ALL_TASK_STATUSES, ISSUE_TYPES } from '@/config/site';
import { useAuth } from './auth-context';

// Helper function to convert Firestore Timestamps to Date objects within an object
function convertTimestampsToDates<T>(data: T): T {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  const newData: any = Array.isArray(data) ? [] : {};
  for (const key in data) {
    const value = data[key];
    if (value instanceof Timestamp) {
      newData[key] = value.toDate();
    } else if (typeof value === 'object') {
      newData[key] = convertTimestampsToDates(value);
    } else {
      newData[key] = value;
    }
  }
  return newData as T;
}

// Helper function to convert Dates to Firestore Timestamps before saving
function convertDatesToTimestamps<T>(data: T): T {
   if (data === null || typeof data !== 'object') {
    return data;
  }

  const newData: any = Array.isArray(data) ? [] : {};
    for (const key in data) {
        const value = data[key];
        if (value instanceof Date) {
            newData[key] = Timestamp.fromDate(value);
        } else if (typeof value === 'object' && !(value instanceof Timestamp)) {
            newData[key] = convertDatesToTimestamps(value);
        } else {
            newData[key] = value;
        }
    }
    return newData as T;
}

// Helper to get board column title
const getBoardColumnTitle = (statusId: string, allProjects: Project[], projectId?: string | null): string => {
  const project = allProjects.find(p => p.id === projectId);
  const column = project?.boardColumns?.find(col => col.id === statusId);
  if (column) return column.title;
  const fallbackStatus = ALL_TASK_STATUSES.find(s => s.id === statusId);
  return fallbackStatus?.title || statusId;
};


interface AppDataContextType {
  tasks: Task[];
  projects: Project[];
  users: AppUserType[];
  sprints: Sprint[];
  teams: Team[];
  chatChannels: ChatChannel[];
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  notifications: Notification[];
  selectedProjectId: string | null;
  activeSprint: Sprint | null;
  setSelectedProjectId: (projectId: string | null) => void;
  addTask: (taskData: TaskFormValues, status: string) => Promise<void>;
  updateTask: (updatedTask: Task, originalTask?: Task) => Promise<void>;
  addProject: (projectData: ProjectFormValues) => Promise<void>;
  updateProject: (updatedProject: Project) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addSprint: (sprintData: CreateSprintFormValues, projectId: string) => Promise<void>;
  updateSprint: (updatedSprint: Sprint, originalSprint?: Sprint) => Promise<void>;
  assignTaskToSprint: (taskId: string, sprintId: string | null) => Promise<void>;
  addTeam: (teamData: TeamFormValues) => Promise<void>;
  updateTeam: (updatedTeam: Team) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  addUser: (userData: UserFormValues) => Promise<void>;
  updateUser: (updatedUser: AppUserType) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  assignUserToTeam: (userId: string, teamId: string | null) => Promise<void>;
  addChatChannel: (channelData: ChatChannelFormValues) => Promise<void>;
  addChatThread: (channelId: string, threadData: ChatThreadFormValues, userId: string) => Promise<void>;
  addChatMessage: (threadId: string, content: string, userId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: (userId: string) => Promise<void>;
  isLoading: boolean;
  allProjectsData: Project[]; // Expose all projects data
  openCreateTaskDialog?: (status?: string, task?: Task, projectId?: string | null, issueType?: IssueType) => void;
  openCreateSprintDialog?: (projectId?: string | null, sprintToEdit?: Sprint | null) => void; // Modified to accept sprintToEdit
  openViewTaskDialog?: (task: Task) => void;
  openRenameProjectDialog?: (project: Project) => void;
  openCreateTeamDialog?: (team?: Team) => void;
  openCreateUserDialog?: (user?: AppUserType) => void;
  openSprintRetrospectiveDialog?: (sprint: Sprint) => void;
  openCreateChannelDialog?: () => void;
  openCreateThreadDialog?: (channelId: string) => void;
  openNotificationsPanel?: () => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({
  children,
  openCreateTaskDialog,
  openCreateSprintDialog,
  openViewTaskDialog,
  openRenameProjectDialog,
  openCreateTeamDialog,
  openCreateUserDialog,
  openSprintRetrospectiveDialog,
  openCreateChannelDialog,
  openCreateThreadDialog,
  openNotificationsPanel,
}: {
  children: ReactNode;
  openCreateTaskDialog?: AppDataContextType['openCreateTaskDialog'];
  openCreateSprintDialog?: AppDataContextType['openCreateSprintDialog'];
  openViewTaskDialog?: AppDataContextType['openViewTaskDialog'];
  openRenameProjectDialog?: AppDataContextType['openRenameProjectDialog'];
  openCreateTeamDialog?: AppDataContextType['openCreateTeamDialog'];
  openCreateUserDialog?: AppDataContextType['openCreateUserDialog'];
  openSprintRetrospectiveDialog?: AppDataContextType['openSprintRetrospectiveDialog'];
  openCreateChannelDialog?: AppDataContextType['openCreateChannelDialog'];
  openCreateThreadDialog?: AppDataContextType['openCreateThreadDialog'];
  openNotificationsPanel?: AppDataContextType['openNotificationsPanel'];
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allProjectsData, setAllProjectsData] = useState<Project[]>([]);
  const [users, setUsers] = useState<AppUserType[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { appUser, loading: authLoading } = useAuth();
  const currentUserId = appUser?.id;

  const [initialProjectsLoaded, setInitialProjectsLoaded] = useState(false);
  const [initialUsersLoaded, setInitialUsersLoaded] = useState(false);
  const [initialTeamsLoaded, setInitialTeamsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedProjectId = localStorage.getItem('selectedProjectId');
        if (storedProjectId && storedProjectId !== "null" && storedProjectId !== "undefined") {
            setSelectedProjectIdState(storedProjectId);
        }
    }
  }, []);


  useEffect(() => {
    const dataStillLoading = !(initialProjectsLoaded && initialUsersLoaded && initialTeamsLoaded);
    setIsLoading(authLoading || dataStillLoading);
  }, [authLoading, initialProjectsLoaded, initialUsersLoaded, initialTeamsLoaded]);

  const accessibleProjects = useMemo(() => {
    if (isLoading || !appUser) return []; 
    if (appUser.role === 'Administrator') {
      return allProjectsData;
    }
    return allProjectsData.filter(project => {
      const userDirectlyAllowed = project.allowedUserIds?.includes(appUser.id);
      const userInAllowedTeam = appUser.teamId && project.allowedTeamIds?.includes(appUser.teamId);
      return userDirectlyAllowed || userInAllowedTeam;
    });
  }, [allProjectsData, appUser, isLoading]);

  const userHasProjectAccess = useCallback((targetUserId: string, projectId: string): boolean => {
    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) return false;
    if (targetUser.role === 'Administrator') return true;

    const project = allProjectsData.find(p => p.id === projectId);
    if (!project) return false; 

    if (project.allowedUserIds?.includes(targetUserId)) return true;
    if (targetUser.teamId && project.allowedTeamIds?.includes(targetUser.teamId)) return true;
    
    return false;
  }, [users, allProjectsData]); 

  const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    if (!notificationData.recipientUserId) {
      console.warn("Skipping notification: recipientUserId is missing", notificationData);
      return;
    }
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        isRead: false,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error adding notification:", error);
    }
  }, []);

  useEffect(() => {
    setInitialProjectsLoaded(false);
    setInitialUsersLoaded(false);
    setInitialTeamsLoaded(false);

    const unsubscribers: (() => void)[] = [];

    const setupSubscription = <T extends { id: string }>(
      collectionName: string,
      setState: React.Dispatch<React.SetStateAction<T[]>>,
      setInitialLoadedFlag?: React.Dispatch<React.SetStateAction<boolean>>,
      orderByFieldParam?: string,
      orderDirectionParam?: 'asc' | 'desc',
      qFn?: (ref: any) => any
    ) => {
      const orderByField = orderByFieldParam === undefined ? 'createdAt' : orderByFieldParam;
      const orderDirection = orderDirectionParam === undefined ? 'desc' : orderDirectionParam;

      if (typeof orderByField !== 'string' || orderByField.trim() === '') {
        console.error(`[AppDataContext] Invalid orderByField for collection '${collectionName}':`, orderByField, ". Aborting subscription setup.");
        if (setInitialLoadedFlag) setInitialLoadedFlag(true); 
        return;
      }

      let colRef = collection(db, collectionName) as any;
      if (qFn) {
        colRef = qFn(colRef);
      }

      const q = query(colRef, orderBy(orderByField, orderDirection));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let dataList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        
        if (collectionName === 'users') {
            dataList = dataList.map(userDoc => {
                const userData = userDoc as any;
                let role: Role = 'User';
                if (userData.isAdmin === true) { // Backward compatibility
                    role = 'Administrator';
                } else if (userData.role) {
                    role = userData.role as Role;
                }
                return { ...userDoc, role: role } as T;
            });
        }
        
        setState(dataList.map(item => convertTimestampsToDates(item)));
        if (setInitialLoadedFlag) {
          setInitialLoadedFlag(true);
        }
      }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        if (setInitialLoadedFlag) {
          setInitialLoadedFlag(true); 
        }
      });
      unsubscribers.push(unsubscribe);
    };

    setupSubscription<Project>('projects', setAllProjectsData, setInitialProjectsLoaded); 
    setupSubscription<AppUserType>('users', setUsers, setInitialUsersLoaded, 'name', 'asc');
    setupSubscription<Team>('teams', setTeams, setInitialTeamsLoaded);
    setupSubscription<Task>('tasks', setTasks, undefined);
    setupSubscription<Sprint>('sprints', setSprints, undefined, 'endDate', 'desc');
    setupSubscription<ChatChannel>('chatChannels', setChatChannels, undefined, 'name', 'asc');
    setupSubscription<ChatThread>('chatThreads', setChatThreads, undefined, 'lastMessageAt', 'desc');
    setupSubscription<ChatMessage>('chatMessages', setChatMessages, undefined, 'createdAt', 'asc');

    if (currentUserId) {
        setupSubscription<Notification>(
            'notifications',
            setNotifications,
            undefined, 
            'createdAt',
            'desc',
            (ref) => query(ref, where('recipientUserId', '==', currentUserId))
        );
    } else {
        setNotifications([]);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUserId]); 


  useEffect(() => {
    if (!isLoading && appUser) { 
      const currentSelectedProjectIsValid = selectedProjectId && accessibleProjects.some(p => p.id === selectedProjectId);
      if (!currentSelectedProjectIsValid) {
        const newSelectedProjectId = accessibleProjects.length > 0 ? accessibleProjects[0].id : null;
        if (selectedProjectId !== newSelectedProjectId) {
            setSelectedProjectIdState(newSelectedProjectId);
        }
      }
    }
  }, [accessibleProjects, selectedProjectId, isLoading, appUser]);


  useEffect(() => {
    if (!isLoading) { 
        if (selectedProjectId !== null) {
            localStorage.setItem('selectedProjectId', selectedProjectId);
        } else {
            if (localStorage.getItem('selectedProjectId')) {
                 localStorage.removeItem('selectedProjectId');
            }
        }
    }
   }, [selectedProjectId, isLoading]);

   useEffect(() => {
    if (selectedProjectId && sprints.length > 0) {
      const projectSprints = sprints.filter(s => s.projectId === selectedProjectId);
      const currentActiveSprint = projectSprints.find(s => s.status === 'active');
      setActiveSprint(currentActiveSprint || null);
    } else {
      setActiveSprint(null);
    }
  }, [selectedProjectId, sprints]);

  const setSelectedProjectIdCallback = useCallback((projectId: string | null) => {
    setSelectedProjectIdState(projectId);
  }, []);

  const addTask = useCallback(async (taskData: TaskFormValues, status: string) => {
    if (!appUser || !['Administrator', 'Manager', 'Supervisor'].includes(appUser.role)) {
        console.error("Permission Denied: User does not have rights to add tasks.");
        return;
    }
    const finalProjectId = taskData.projectId || selectedProjectId;
    if (!finalProjectId) { throw new Error("Cannot add task: No project is selected or specified."); }

    const subtasksArray = typeof taskData.subtasks === 'string'
        ? taskData.subtasks.split('\n').filter(s => s.trim() !== '')
        : [];

    const newTaskDataForDb: Partial<Task> & { createdAt: Timestamp, projectId: string, issueType: IssueType, status: string } = {
      title: taskData.title,
      description: taskData.description || '',
      assignedUserIds: taskData.assignedUserIds || [],
      assignedTeamIds: taskData.assignedTeamIds || [],
      dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : undefined,
      status: status,
      issueType: taskData.issueType || DEFAULT_ISSUE_TYPE,
      subtasks: subtasksArray,
      storyPoints: taskData.storyPoints ?? undefined,
      sprintId: taskData.sprintId === '@_NO_SPRINT_@' ? null : taskData.sprintId || null,
      parentStoryId: taskData.parentStoryId === '@_NO_PARENT_@' ? null : taskData.parentStoryId || null,
      epicId: taskData.epicId === '@_NO_PARENT_@' ? null : taskData.epicId || null,
      createdAt: Timestamp.now(),
      projectId: finalProjectId,
    };
    
    Object.keys(newTaskDataForDb).forEach(key => (newTaskDataForDb as any)[key] === undefined && delete (newTaskDataForDb as any)[key]);


    try {
      const docRef = await addDoc(collection(db, 'tasks'), newTaskDataForDb);
      const issueTypeTitle = ISSUE_TYPES.find(it => it.id === newTaskDataForDb.issueType)?.title || newTaskDataForDb.issueType;
      const projectName = allProjectsData.find(p=>p.id === finalProjectId)?.name || 'Project';

      const recipientCandidates = new Set<string>();
      // Add assigned users
      (newTaskDataForDb.assignedUserIds || []).forEach(uid => recipientCandidates.add(uid));
      // Add members of assigned teams
      (newTaskDataForDb.assignedTeamIds || []).forEach(teamId => {
        const team = teams.find(t => t.id === teamId);
        (team?.memberIds || []).forEach(memberId => recipientCandidates.add(memberId));
      });
      // Add Admins and Managers
      users.forEach(user => {
        if (user.role === 'Administrator' || user.role === 'Manager') {
          recipientCandidates.add(user.id);
        }
      });
      
      recipientCandidates.forEach(uid => {
        if (uid !== appUser?.id && userHasProjectAccess(uid, finalProjectId)) {
          addNotification({
            recipientUserId: uid,
            actorUserId: appUser?.id,
            type: 'task_created',
            title: `New ${issueTypeTitle} in "${projectName}": ${newTaskDataForDb.title}`,
            message: `${appUser?.name || 'Someone'} created the ${issueTypeTitle.toLowerCase()} "${newTaskDataForDb.title}".`,
            entityId: docRef.id,
            entityType: 'task',
            link: `/dashboard?taskId=${docRef.id}&projectId=${finalProjectId}`
          });
        }
      });

    } catch (error) {
      console.error("Error adding task:", error);
    }
  }, [selectedProjectId, addNotification, appUser, userHasProjectAccess, teams, users, allProjectsData]);

  const updateTask = useCallback(async (updatedTask: Task, originalTask?: Task) => {
     if (!appUser || !['Administrator', 'Manager', 'Supervisor'].includes(appUser.role)) {
        console.error("Permission Denied: User does not have rights to update tasks.");
        return;
    }
    const taskRef = doc(db, 'tasks', updatedTask.id);
    const taskProjectId = updatedTask.projectId || selectedProjectId;
    if (!taskProjectId) {
      console.error("Error updating task: Project ID missing.");
      return;
    }

    const dataToUpdate = convertDatesToTimestamps({
        ...updatedTask,
        id: undefined, 
        projectId: taskProjectId,
        issueType: updatedTask.issueType || DEFAULT_ISSUE_TYPE,
        assignedUserIds: updatedTask.assignedUserIds || [],
        assignedTeamIds: updatedTask.assignedTeamIds || [],
        storyPoints: updatedTask.storyPoints ?? null,
        parentStoryId: updatedTask.parentStoryId === '@_NO_PARENT_@' ? null : updatedTask.parentStoryId || null,
        epicId: updatedTask.epicId === '@_NO_PARENT_@' ? null : updatedTask.epicId || null,
    });
    Object.keys(dataToUpdate).forEach(key => (dataToUpdate as any)[key] === undefined && delete (dataToUpdate as any)[key]);

    const actualOriginalTask = originalTask || tasks.find(t => t.id === updatedTask.id);

    try {
      await updateDoc(taskRef, dataToUpdate);
      const issueTypeTitle = ISSUE_TYPES.find(it => it.id === updatedTask.issueType)?.title || updatedTask.issueType;
      const projectName = allProjectsData.find(p=>p.id === taskProjectId)?.name || 'Project';

      if (actualOriginalTask) {
        const recipientCandidates = new Set<string>();
        // Add current assigned users
        (updatedTask.assignedUserIds || []).forEach(uid => recipientCandidates.add(uid));
        // Add members of current assigned teams
        (updatedTask.assignedTeamIds || []).forEach(teamId => {
            const team = teams.find(t => t.id === teamId);
            (team?.memberIds || []).forEach(memberId => recipientCandidates.add(memberId));
        });
        // Also consider originally assigned users/teams if they were removed, so they get a status change notification
        (actualOriginalTask.assignedUserIds || []).forEach(uid => recipientCandidates.add(uid));
        (actualOriginalTask.assignedTeamIds || []).forEach(teamId => {
          const team = teams.find(t => t.id === teamId);
          (team?.memberIds || []).forEach(memberId => recipientCandidates.add(memberId));
        });
        // Add Admins and Managers
        users.forEach(user => {
            if (user.role === 'Administrator' || user.role === 'Manager') {
              recipientCandidates.add(user.id);
            }
        });
        
        const newAssignees = new Set<string>();
        (updatedTask.assignedUserIds || []).forEach(uid => {
            if (!(actualOriginalTask.assignedUserIds || []).includes(uid)) {
                newAssignees.add(uid);
            }
        });
        (updatedTask.assignedTeamIds || []).forEach(teamId => {
            if (!(actualOriginalTask.assignedTeamIds || []).includes(teamId)) {
                const team = teams.find(t => t.id === teamId);
                (team?.memberIds || []).forEach(memberId => {
                    if (!(actualOriginalTask.assignedUserIds || []).includes(memberId) && !(updatedTask.assignedUserIds || []).includes(memberId) ) {
                         newAssignees.add(memberId);
                    }
                });
            }
        });

        newAssignees.forEach(uid => {
          if (uid !== appUser?.id && userHasProjectAccess(uid, taskProjectId)) {
            addNotification({
              recipientUserId: uid,
              actorUserId: appUser?.id,
              type: 'task_assigned',
              title: `Task Assigned in "${projectName}": ${updatedTask.title}`,
              message: `${appUser?.name || 'Someone'} assigned you to the ${issueTypeTitle.toLowerCase()} "${updatedTask.title}".`,
              entityId: updatedTask.id,
              entityType: 'task',
              link: `/dashboard?taskId=${updatedTask.id}&projectId=${taskProjectId}`
            });
          }
        });

        if (actualOriginalTask.status !== updatedTask.status) {
          const oldStatusTitle = getBoardColumnTitle(actualOriginalTask.status, allProjectsData, taskProjectId);
          const newStatusTitle = getBoardColumnTitle(updatedTask.status, allProjectsData, taskProjectId);
          
          recipientCandidates.forEach(uid => {
             if (uid !== appUser?.id && userHasProjectAccess(uid, taskProjectId)) {
                let notificationType: NotificationType | null = null;
                let notificationTitle = '';
                let notificationMessage = '';
                let notificationLink = `/dashboard?taskId=${updatedTask.id}&projectId=${taskProjectId}`;

                if (actualOriginalTask.status === BACKLOG_STATUS_ID && updatedTask.status !== BACKLOG_STATUS_ID) {
                    notificationType = 'task_moved_from_backlog';
                    notificationTitle = `Task to Board in "${projectName}": ${updatedTask.title}`;
                    notificationMessage = `Task "${updatedTask.title}" moved from Backlog to "${newStatusTitle}".`;
                } else if (updatedTask.status === BACKLOG_STATUS_ID && actualOriginalTask.status !== BACKLOG_STATUS_ID) {
                    notificationType = 'task_moved_from_backlog'; 
                    notificationTitle = `Task to Backlog in "${projectName}": ${updatedTask.title}`;
                    notificationMessage = `Task "${updatedTask.title}" returned to Backlog from "${oldStatusTitle}".`;
                    notificationLink = `/backlog?taskId=${updatedTask.id}&projectId=${taskProjectId}`;
                } else if (updatedTask.status !== BACKLOG_STATUS_ID && actualOriginalTask.status !== BACKLOG_STATUS_ID) {
                    notificationType = 'task_status_changed';
                    notificationTitle = `Task Status Change in "${projectName}": ${updatedTask.title}`;
                    notificationMessage = `Status of task "${updatedTask.title}" changed from "${oldStatusTitle}" to "${newStatusTitle}".`;
                }

                if (notificationType) {
                     addNotification({
                        recipientUserId: uid,
                        actorUserId: appUser?.id,
                        type: notificationType,
                        title: notificationTitle,
                        message: notificationMessage,
                        entityId: updatedTask.id,
                        entityType: 'task',
                        link: notificationLink
                    });
                }
             }
          });
        }
      }

    } catch (error) {
      console.error("Error updating task:", error);
    }
  }, [selectedProjectId, tasks, addNotification, appUser, allProjectsData, userHasProjectAccess, teams, users]);

  const addProject = useCallback(async (projectData: ProjectFormValues) => {
    if (!appUser || !['Administrator', 'Manager'].includes(appUser.role)) {
        console.error("Permission Denied: User does not have rights to add projects.");
        return;
    }

    let finalAllowedUserIds = projectData.allowedUserIds || [];
    if (appUser && (appUser.role === 'Administrator' || appUser.role === 'Manager') && !finalAllowedUserIds.includes(appUser.id)) {
        finalAllowedUserIds = [...finalAllowedUserIds, appUser.id];
    }

    const newProjectData = {
      name: projectData.name,
      description: projectData.description || '',
      allowedUserIds: finalAllowedUserIds,
      allowedTeamIds: projectData.allowedTeamIds || [],
      createdAt: Timestamp.now(),
      boardColumns: DEFAULT_KANBAN_BOARD_COLUMNS,
    };
    try {
      const docRef = await addDoc(collection(db, 'projects'), newProjectData);
      const newProjectId = docRef.id;

      const recipientCandidates = new Set<string>();
      (newProjectData.allowedUserIds || []).forEach(uid => recipientCandidates.add(uid));
      if (newProjectData.allowedTeamIds && newProjectData.allowedTeamIds.length > 0) {
        const projectTeams = teams.filter(t => newProjectData.allowedTeamIds.includes(t.id));
        projectTeams.forEach(team => {
          (team.memberIds || []).forEach(memberId => recipientCandidates.add(memberId));
        });
      }
       // Add all Admins and Managers
      users.forEach(user => {
        if (user.role === 'Administrator' || user.role === 'Manager') {
          recipientCandidates.add(user.id);
        }
      });
      
      recipientCandidates.forEach(uid => {
        if (uid !== appUser?.id && userHasProjectAccess(uid, newProjectId)) {
            let title = `Added to Project: ${newProjectData.name}`;
            let message = `${appUser?.name || 'Someone'} added you to the new project: "${newProjectData.name}".`;

            if ((users.find(u=>u.id===uid)?.role === 'Administrator' || users.find(u=>u.id===uid)?.role === 'Manager') &&
                !newProjectData.allowedUserIds.includes(uid) &&
                !(teams.find(t => newProjectData.allowedTeamIds.includes(t.id))?.memberIds.includes(uid))
            ) {
                title = `New Project Created: ${newProjectData.name}`;
                message = `${appUser?.name || 'Someone'} created a new project: "${newProjectData.name}". You have access.`;
            }

            addNotification({
                recipientUserId: uid,
                actorUserId: appUser?.id,
                type: 'project_created',
                title: title,
                message: message,
                entityId: newProjectId,
                entityType: 'project',
                link: `/dashboard?projectId=${newProjectId}`
            });
        }
      });


    } catch (error) {
      console.error("Error adding project:", error);
    }
  }, [teams, appUser, addNotification, users, userHasProjectAccess, allProjectsData]);

  const updateProject = useCallback(async (updatedProject: Project) => {
     if (!appUser || !['Administrator', 'Manager'].includes(appUser.role)) {
        console.error("Permission Denied: User does not have rights to update projects.");
        return;
    }
    const projectRef = doc(db, 'projects', updatedProject.id);
    const dataToUpdate = convertDatesToTimestamps({
        name: updatedProject.name,
        description: updatedProject.description || '',
        boardColumns: updatedProject.boardColumns || DEFAULT_KANBAN_BOARD_COLUMNS,
        allowedUserIds: updatedProject.allowedUserIds || [],
        allowedTeamIds: updatedProject.allowedTeamIds || [],
    });
    const { createdAt, ...restOfData } = dataToUpdate as any;

    try {
      await updateDoc(projectRef, restOfData);
    } catch (error) {
      console.error("Error updating project:", error);
    }
  }, [appUser]);

  const deleteProject = useCallback(async (projectIdToDelete: string) => {
    if (!appUser || !['Administrator', 'Manager'].includes(appUser.role)) {
        console.error("Permission Denied: User does not have rights to delete projects.");
        return;
    }
    const batch = writeBatch(db);
    batch.delete(doc(db, 'projects', projectIdToDelete));
    const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectIdToDelete));
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => batch.delete(taskDoc.ref));
    const sprintsQuery = query(collection(db, 'sprints'), where('projectId', '==', projectIdToDelete));
    const sprintsSnapshot = await getDocs(sprintsQuery);
    sprintsSnapshot.forEach(sprintDoc => batch.delete(sprintDoc.ref));
    const channelsQuery = query(collection(db, 'chatChannels'), where('type', '==', 'project'), where('entityId', '==', projectIdToDelete));
    const channelsSnapshot = await getDocs(channelsQuery);
    for (const channelDoc of channelsSnapshot.docs) {
        batch.delete(channelDoc.ref);
        const threadsQuery = query(collection(db, 'chatThreads'), where('channelId', '==', channelDoc.id));
        const threadsSnapshot = await getDocs(threadsQuery);
        for (const threadDoc of threadsSnapshot.docs) {
            batch.delete(threadDoc.ref);
            const messagesQuery = query(collection(db, 'chatMessages'), where('threadId', '==', threadDoc.id));
            const messagesSnapshot = await getDocs(messagesQuery);
            messagesSnapshot.forEach(messageDoc => batch.delete(messageDoc.ref));
        }
    }
    try {
        await batch.commit();
    } catch (error) {
        console.error("Error deleting project and associated data:", error);
    }
  }, [appUser]);

  const addSprint = useCallback(async (sprintData: CreateSprintFormValues, projectId: string) => {
    if (!appUser || !['Administrator', 'Manager', 'Supervisor'].includes(appUser.role)) {
        console.error("Permission Denied: User does not have rights to add sprints.");
        return;
    }
    if (!projectId) throw new Error("Project ID is required to create a sprint.");
    const newSprintData = {
        name: sprintData.name,
        goal: sprintData.goal || '',
        startDate: Timestamp.fromDate(sprintData.startDate),
        endDate: Timestamp.fromDate(sprintData.endDate),
        status: 'planned' as SprintStatus,
        projectId: projectId,
        epicId: sprintData.epicId || null,
        createdAt: Timestamp.now(),
        retrospectiveNotes: '',
    };
    try {
        await addDoc(collection(db, 'sprints'), newSprintData);
    } catch (error) {
        console.error("Error adding sprint:", error);
    }
  }, [appUser]);

  const updateSprint = useCallback(async (updatedSprint: Sprint, originalSprint?: Sprint) => {
    if (!appUser || !['Administrator', 'Manager', 'Supervisor'].includes(appUser.role)) {
        console.error("Permission Denied: User does not have rights to update sprints.");
        return;
    }
    const sprintRef = doc(db, 'sprints', updatedSprint.id);
    // Ensure Timestamps are correctly handled for dates coming from a form (which might be Date objects)
    // and that existing Timestamps from the `updatedSprint` object are preserved.
    const dataToUpdate = {
        ...updatedSprint, // Spread existing fields
        // Explicitly convert Date objects from form to Timestamps if they are Dates
        startDate: updatedSprint.startDate instanceof Date ? Timestamp.fromDate(updatedSprint.startDate) : updatedSprint.startDate,
        endDate: updatedSprint.endDate instanceof Date ? Timestamp.fromDate(updatedSprint.endDate) : updatedSprint.endDate,
        // Ensure epicId is included, even if it's null
        epicId: updatedSprint.epicId || null,
        id: undefined // Do not update the ID field itself
    };
    // Remove the id property before sending to Firestore for update
    delete (dataToUpdate as any).id; 
    // Firestore's updateDoc will only update fields provided.
    // If fields like createdAt should be immutable, they should not be in dataToUpdate.
    // The current structure means if `updatedSprint` has `createdAt`, it will be re-sent.

    const actualOriginalSprint = originalSprint || sprints.find(s => s.id === updatedSprint.id);

    try {
      await updateDoc(sprintRef, dataToUpdate);

      if (actualOriginalSprint && actualOriginalSprint.status !== updatedSprint.status) {
        const project = allProjectsData.find(p => p.id === updatedSprint.projectId);
        let notifType: NotificationType | null = null;
        let notifTitle = '';
        let notifMessage = '';

        if (updatedSprint.status === 'active') {
          notifType = 'sprint_started';
          notifTitle = `Sprint Started: ${updatedSprint.name}`;
          notifMessage = `Sprint "${updatedSprint.name}" for project "${project?.name || 'Unknown Project'}" has started.`;
        } else if (updatedSprint.status === 'completed') {
          notifType = 'sprint_finished';
          notifTitle = `Sprint Finished: ${updatedSprint.name}`;
          notifMessage = `Sprint "${updatedSprint.name}" for project "${project?.name || 'Unknown Project'}" has finished.`;
        }

        if (notifType && project) {
          const recipientCandidates = new Set<string>();
          (project.allowedUserIds || []).forEach(uid => recipientCandidates.add(uid));
          (project.allowedTeamIds || []).forEach(teamId => {
            const team = teams.find(t => t.id === teamId);
            (team?.memberIds || []).forEach(memberId => recipientCandidates.add(memberId));
          });
          users.forEach(user => {
            if (user.role === 'Administrator' || user.role === 'Manager') {
              recipientCandidates.add(user.id);
            }
          });
          
          recipientCandidates.forEach(uid => {
             if (uid !== appUser?.id && userHasProjectAccess(uid, project.id) ) { 
                addNotification({
                    recipientUserId: uid,
                    actorUserId: appUser?.id,
                    type: notifType!,
                    title: notifTitle,
                    message: notifMessage,
                    entityId: updatedSprint.id,
                    entityType: 'sprint',
                    link: `/sprints?projectId=${updatedSprint.projectId}`
                });
            }
          });
        }
      }
    } catch (error) {
      console.error("Error updating sprint:", error);
    }
  }, [addNotification, appUser, allProjectsData, sprints, teams, userHasProjectAccess, users]);

  const assignTaskToSprint = useCallback(async (taskId: string, sprintId: string | null) => {
    if (!appUser || !['Administrator', 'Manager', 'Supervisor'].includes(appUser.role)) {
        console.error("Permission Denied: User does not have rights to assign tasks to sprints.");
        return;
    }
    const taskRef = doc(db, 'tasks', taskId);
    try {
      await updateDoc(taskRef, { sprintId: sprintId });
    } catch (error) {
      console.error("Error assigning task to sprint:", error);
    }
  }, [appUser]);

  const addTeam = useCallback(async (teamData: TeamFormValues) => {
    if (appUser?.role !== 'Administrator') {
        console.error("Permission Denied: Only Administrators can add teams.");
        return;
    }
    const newTeamData = {
        name: teamData.name,
        description: teamData.description || '',
        memberIds: [],
        createdAt: Timestamp.now()
    };
    try {
       await addDoc(collection(db, 'teams'), newTeamData);
    } catch (error) {
        console.error("Error adding team:", error);
    }
  }, [appUser]);

  const updateTeam = useCallback(async (updatedTeam: Team) => {
    if (appUser?.role !== 'Administrator') {
        console.error("Permission Denied: Only Administrators can update teams.");
        return;
    }
    const teamRef = doc(db, 'teams', updatedTeam.id);
    const dataToUpdate = convertDatesToTimestamps({
        name: updatedTeam.name,
        description: updatedTeam.description || '',
        memberIds: updatedTeam.memberIds || [],
    });
    const { createdAt, ...restOfData } = dataToUpdate as any;
    try {
       await updateDoc(teamRef, restOfData);
    } catch (error) {
        console.error("Error updating team:", error);
    }
  }, [appUser]);

  const deleteTeam = useCallback(async (teamId: string) => {
    if (appUser?.role !== 'Administrator') {
        console.error("Permission Denied: Only Administrators can delete teams.");
        return;
    }
    const batch = writeBatch(db);
    batch.delete(doc(db, 'teams', teamId));

    const usersQuery = query(collection(db, 'users'), where('teamId', '==', teamId));
    const usersSnapshot = await getDocs(usersQuery);
    usersSnapshot.forEach(userDoc => batch.update(userDoc.ref, { teamId: null }));

    const tasksQuery = query(collection(db, 'tasks'), where('assignedTeamIds', 'array-contains', teamId));
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => {
        const currentTeams = taskDoc.data().assignedTeamIds || [];
        batch.update(taskDoc.ref, { assignedTeamIds: currentTeams.filter((id: string) => id !== teamId) });
    });

    const projectsQuery = query(collection(db, 'projects'), where('allowedTeamIds', 'array-contains', teamId));
    const projectsSnapshot = await getDocs(projectsQuery);
    projectsSnapshot.forEach(projectDoc => {
        const currentAllowedTeams = projectDoc.data().allowedTeamIds || [];
        batch.update(projectDoc.ref, { allowedTeamIds: currentAllowedTeams.filter((id: string) => id !== teamId) });
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error deleting team and updating references:", error);
    }
  }, [appUser]);

   const addUser = useCallback(async (userData: UserFormValues) => {
    if (appUser?.role !== 'Administrator') {
        console.error("Permission denied: Only administrators can add user profiles.");
        return;
    }
    if (!userData.id) {
        console.error("Cannot add user profile: Firebase Auth UID is missing.");
        return;
    }
    const newUserDoc = {
      name: userData.name,
      avatar: userData.avatar || `https://placehold.co/40x40.png`, 
      teamId: userData.teamId === '@_NO_TEAM_@' ? null : userData.teamId || null,
      role: userData.role,
      createdAt: Timestamp.now(),
    };
     try {
       await setDoc(doc(db, 'users', userData.id), newUserDoc);
       if (newUserDoc.teamId && newUserDoc.teamId !== '@_NO_TEAM_@') {
            const teamRef = doc(db, 'teams', newUserDoc.teamId);
            const teamSnap = await getDoc(teamRef);
            if (teamSnap.exists()) {
                const teamData = teamSnap.data();
                const memberIds = teamData.memberIds || [];
                if (!memberIds.includes(userData.id)) {
                    await updateDoc(teamRef, { memberIds: [...memberIds, userData.id] });
                }
            }
       }
     } catch (error) {
        console.error("Error adding user data:", error);
     }
  }, [appUser]);

 const updateUser = useCallback(async (updatedUser: AppUserType) => {
    const currentUserIsAdmin = appUser?.role === 'Administrator';
    if (!currentUserIsAdmin && appUser?.id !== updatedUser.id) {
        console.error("Permission Denied: User does not have rights to update this profile.");
        return;
    }
    const userRef = doc(db, 'users', updatedUser.id);
    const originalUserSnap = await getDoc(userRef);
    const originalUserData = originalUserSnap.exists() ? originalUserSnap.data() as AppUserType : null;

    const dataToUpdate: Partial<AppUserType> = {
        name: updatedUser.name,
        avatar: updatedUser.avatar || '',
        teamId: updatedUser.teamId === '@_NO_TEAM_@' ? null : updatedUser.teamId || null,
    };
    
    if (currentUserIsAdmin && appUser?.id !== updatedUser.id) {
      dataToUpdate.role = updatedUser.role;
    } else if (appUser?.id === updatedUser.id && originalUserData) { 
      dataToUpdate.role = originalUserData.role; 
    }


    try {
       await updateDoc(userRef, convertDatesToTimestamps(dataToUpdate));
       const originalTeamId = originalUserData?.teamId;
       const newTeamId = dataToUpdate.teamId;

       if (originalTeamId !== newTeamId) {
           if (originalTeamId) {
               const oldTeamRef = doc(db, 'teams', originalTeamId);
               const oldTeamSnap = await getDoc(oldTeamRef);
               if (oldTeamSnap.exists()) {
                   const oldTeamData = oldTeamSnap.data();
                   await updateDoc(oldTeamRef, {
                       memberIds: (oldTeamData.memberIds || []).filter((id: string) => id !== updatedUser.id)
                   });
               }
           }
           if (newTeamId && newTeamId !== '@_NO_TEAM_@') {
               const newTeamRef = doc(db, 'teams', newTeamId);
               const newTeamSnap = await getDoc(newTeamRef);
               if (newTeamSnap.exists()) {
                   const newTeamData = newTeamSnap.data();
                   const memberIds = newTeamData.memberIds || [];
                   if (!memberIds.includes(updatedUser.id)) {
                        await updateDoc(newTeamRef, { memberIds: [...memberIds, updatedUser.id] });
                   }
               }
           }
       }

    } catch (error) {
        console.error("Error updating user:", error);
    }
  }, [appUser]);

  const deleteUser = useCallback(async (userIdToDelete: string) => {
    if (appUser?.role !== 'Administrator') {
        console.error("Permission denied: Only administrators can delete user profiles.");
        return;
    }
    if (appUser?.id === userIdToDelete) {
        console.warn("Admin attempting to delete self. This operation is disallowed from the UI.");
        return;
    }
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userIdToDelete);

    const userSnap = await getDoc(userRef);
    const teamId = userSnap.exists() ? (userSnap.data() as AppUserType).teamId : null;

    batch.delete(userRef);

    if (teamId) {
        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
            const currentMembers = teamSnap.data().memberIds || [];
            batch.update(teamRef, { memberIds: currentMembers.filter((id: string) => id !== userIdToDelete) });
        }
    }

    const tasksQuery = query(collection(db, 'tasks'), where('assignedUserIds', 'array-contains', userIdToDelete));
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => {
        const currentAssignees = taskDoc.data().assignedUserIds || [];
        batch.update(taskDoc.ref, { assignedUserIds: currentAssignees.filter((id: string) => id !== userIdToDelete) });
    });

    const projectsQuery = query(collection(db, 'projects'), where('allowedUserIds', 'array-contains', userIdToDelete));
    const projectsSnapshot = await getDocs(projectsQuery);
    projectsSnapshot.forEach(projectDoc => {
        const currentAllowedUsers = projectDoc.data().allowedUserIds || [];
        batch.update(projectDoc.ref, { allowedUserIds: currentAllowedUsers.filter((id: string) => id !== userIdToDelete) });
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error deleting user profile and updating references:", error);
    }
  }, [appUser]);

  const assignUserToTeam = useCallback(async (userIdToAssign: string, teamId: string | null) => {
    if (appUser?.role !== 'Administrator') {
        console.error("Permission Denied: Only Administrators can assign users to teams.");
        return;
    }
    const userToUpdate = users.find(u => u.id === userIdToAssign);
    if (userToUpdate) {
        await updateUser({ ...userToUpdate, teamId: teamId });
    } else {
        console.error("User not found for team assignment:", userIdToAssign);
    }
  }, [appUser, users, updateUser]);

  const addChatChannel = useCallback(async (channelData: ChatChannelFormValues) => {
    if (!appUser || !['Administrator', 'Manager', 'Supervisor'].includes(appUser.role)) {
        console.error("Permission Denied: User does not have rights to create chat channels.");
        return;
    }
    const newChannelData = {
        name: channelData.name,
        description: channelData.description || '',
        type: 'general' as ChatChannelType,
        createdAt: Timestamp.now()
    };
    try {
       await addDoc(collection(db, 'chatChannels'), newChannelData);
    } catch (error) {
        console.error("Error adding chat channel:", error);
    }
  }, [appUser]);

  const addChatThread = useCallback(async (channelId: string, threadData: ChatThreadFormValues, creatorUserId: string) => {
    const now = Timestamp.now();
    const newThreadData = {
        channelId: channelId,
        title: threadData.title,
        createdByUserId: creatorUserId,
        createdAt: now,
        lastMessageAt: now,
        messageCount: 1
    };
    const initialMessageData = {
        userId: creatorUserId,
        content: threadData.initialMessage,
        createdAt: now
    };
    try {
        const threadRef = await addDoc(collection(db, 'chatThreads'), newThreadData);
        await addDoc(collection(db, 'chatMessages'), {
            ...initialMessageData,
            threadId: threadRef.id
        });
    } catch (error) {
        console.error("Error adding chat thread and initial message:", error);
    }
  }, []);

  const addChatMessage = useCallback(async (threadId: string, content: string, senderUserId: string) => {
    const newMessageData = {
        threadId: threadId,
        userId: senderUserId,
        content: content,
        createdAt: Timestamp.now()
    };
    const batch = writeBatch(db);
    const threadRef = doc(db, 'chatThreads', threadId);
    const messageRef = doc(collection(db, 'chatMessages'));
    batch.set(messageRef, newMessageData);
    const threadDocSnap = await getDoc(threadRef);
    if (threadDocSnap.exists()) {
      const currentCount = threadDocSnap.data()?.messageCount || 0;
       batch.update(threadRef, {
           lastMessageAt: newMessageData.createdAt,
           messageCount: currentCount + 1
       });
    } else {
        console.warn("Thread document not found for update:", threadId);
        await addDoc(collection(db, 'chatMessages'), newMessageData); 
        return;
    }
    try {
       await batch.commit();
       const thread = chatThreads.find(t => t.id === threadId);
       const sender = users.find(u => u.id === senderUserId);

       const messagesInThreadQuery = query(collection(db, 'chatMessages'), where('threadId', '==', threadId));
       const messagesSnapshot = await getDocs(messagesInThreadQuery);
       const participantUserIds = new Set<string>();
       messagesSnapshot.forEach(msgDoc => {
           participantUserIds.add(msgDoc.data().userId);
       });
       if(thread?.createdByUserId) participantUserIds.add(thread.createdByUserId);

       const channel = chatChannels.find(c => c.id === thread?.channelId);
       let projectForChannel: Project | undefined = undefined;
       let relevantProjectIdForAccessCheck: string | undefined = undefined;

       if (channel && (channel.type === 'project' || channel.type === 'sprint' || channel.type === 'task')) {
           if (channel.type === 'project' && channel.entityId) {
               projectForChannel = allProjectsData.find(p => p.id === channel.entityId);
               relevantProjectIdForAccessCheck = projectForChannel?.id;
           } else if (channel.type === 'sprint' && channel.entityId) {
               const sprint = sprints.find(s => s.id === channel.entityId);
               if (sprint) {
                   projectForChannel = allProjectsData.find(p => p.id === sprint.projectId);
                   relevantProjectIdForAccessCheck = projectForChannel?.id;
               }
           } else if (channel.type === 'task' && channel.entityId) {
               const task = tasks.find(t => t.id === channel.entityId);
               if (task && task.projectId) {
                   projectForChannel = allProjectsData.find(p => p.id === task.projectId);
                   relevantProjectIdForAccessCheck = projectForChannel?.id;
               }
           }
       }


       participantUserIds.forEach(participantId => {
           if (participantId !== senderUserId && participantId !== appUser?.id) { 
                let shouldNotify = true;
                if (relevantProjectIdForAccessCheck) { 
                    shouldNotify = userHasProjectAccess(participantId, relevantProjectIdForAccessCheck);
                }

                if (shouldNotify) {
                   addNotification({
                       recipientUserId: participantId,
                       actorUserId: senderUserId,
                       type: 'new_chat_message',
                       title: `New Message in "${thread?.title || 'Chat'}"`,
                       message: `${sender?.name || 'Someone'} sent a message.`,
                       entityId: threadId,
                       entityType: 'thread',
                       link: `/chat?channelId=${thread?.channelId}&threadId=${threadId}`
                   });
                }
           }
       });

    } catch (error) {
        console.error("Error adding chat message and updating thread:", error);
    }
  }, [addNotification, users, chatThreads, appUser, chatChannels, allProjectsData, sprints, tasks, userHasProjectAccess]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    const notificationRef = doc(db, 'notifications', notificationId);
    try {
      await updateDoc(notificationRef, { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async (userIdToMark: string) => {
    if (!userIdToMark) {
        console.warn("Cannot mark all notifications as read: User ID is missing.");
        return;
    }
    const q = query(collection(db, 'notifications'), where('recipientUserId', '==', userIdToMark), where('isRead', '==', false));
    const batch = writeBatch(db);
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(docSnap => {
        batch.update(docSnap.ref, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, []);


  return (
    <AppDataContext.Provider
      value={{
        tasks,
        projects: accessibleProjects, 
        users,
        sprints,
        teams,
        chatChannels,
        chatThreads,
        chatMessages,
        notifications,
        selectedProjectId,
        activeSprint,
        setSelectedProjectId: setSelectedProjectIdCallback,
        addTask, updateTask, addProject, updateProject, deleteProject,
        addSprint, updateSprint, assignTaskToSprint,
        addTeam, updateTeam, deleteTeam,
        addUser, updateUser, deleteUser, assignUserToTeam,
        addChatChannel, addChatThread, addChatMessage,
        addNotification, markNotificationAsRead, markAllNotificationsAsRead,
        isLoading,
        allProjectsData, // Expose all projects data
        openCreateTaskDialog, openCreateSprintDialog, openViewTaskDialog, openRenameProjectDialog,
        openCreateTeamDialog, openCreateUserDialog, openSprintRetrospectiveDialog, openCreateChannelDialog,
        openCreateThreadDialog, openNotificationsPanel,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
