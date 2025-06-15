
'use client';

import type { ReactNode } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppDataProvider, useAppData } from '@/contexts/app-data-context';
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog';
import { CreateProjectDialog } from '@/components/project/create-project-dialog';
import { CreateSprintDialog } from '@/components/sprint/create-sprint-dialog';
import { SprintRetrospectiveDialog } from '@/components/sprint/sprint-retrospective-dialog';
import { ViewTaskDialog } from '@/components/task/view-task-dialog';
import { RenameProjectDialog } from '@/components/project/rename-project-dialog';
import { CreateTeamDialog } from '@/components/team/create-team-dialog';
import { CreateUserDialog } from '@/components/user/create-user-dialog';
import { CreateChannelDialog } from '@/components/chat/create-channel-dialog';
import { CreateThreadDialog } from '@/components/chat/create-thread-dialog';
import { NotificationsPanel } from '@/components/notifications/notifications-panel';
import type { Task, Sprint, Project, Team, User, ChatChannel, KanbanStatus, Notification, Role, IssueType } from '@/types';
import type { TaskFormValues, ProjectFormValues, SprintFormValues, TeamFormValues, UserFormValues, SprintRetrospectiveFormValues, ChatChannelFormValues, ChatThreadFormValues } from '@/lib/schemas';
import { Skeleton } from '@/components/ui/skeleton';
import { BACKLOG_STATUS_ID, DEFAULT_KANBAN_BOARD_COLUMNS, DEFAULT_ISSUE_TYPE } from '@/config/site';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAuth } from '@/contexts/auth-context';
import { Timestamp } from 'firebase/firestore';

function AppLayoutContent({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const {
    projects,
    selectedProjectId, setSelectedProjectId,
    openCreateTaskDialog, isLoading: isAppDataLoading,
    addProject, openCreateTeamDialog, openCreateUserDialog,
    openNotificationsPanel, users, teams, allProjectsData
  } = useAppData();

  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);

  const handleProjectSubmit = (projectData: ProjectFormValues) => { addProject(projectData); };

  const handleToggleNotifications = () => {
    if (openNotificationsPanel) {
      openNotificationsPanel();
    }
  };

  const canCreateProject = appUser?.role === 'Administrator' || appUser?.role === 'Manager';
  const canAddTask = appUser?.role === 'Administrator' || appUser?.role === 'Manager' || appUser?.role === 'Supervisor';


  if (isAppDataLoading) {
    return (
       <div className="peer flex min-h-screen bg-background md:ml-[var(--sidebar-width-icon)] data-[state=expanded]:md:ml-[var(--sidebar-width)] transition-all duration-200 ease-linear">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
            <Skeleton className="h-6 w-6 md:hidden" />
            <Skeleton className="h-6 w-32" />
            <div className="ml-auto flex items-center gap-2 md:gap-4">
              <Skeleton className="h-9 w-[150px] md:w-[200px] hidden sm:inline-flex" />
               <Skeleton className="h-10 w-10 sm:hidden" />
              {canCreateProject && <Skeleton className="h-10 w-28 hidden sm:inline-flex" />}
              {canCreateProject && <Skeleton className="h-10 w-10 sm:hidden" />}
              {canAddTask && <Skeleton className="h-10 w-28 hidden sm:inline-flex" />}
              {canAddTask && <Skeleton className="h-10 w-10 sm:hidden" />}
              <Skeleton className="h-10 w-10 sm:hidden" /> 
              <Skeleton className="h-10 w-10" /> 
            </div>
          </header>
          <main className="flex-1 p-0 md:p-0 lg:p-0 overflow-x-auto">
             <Skeleton className="h-[calc(100vh-10rem)] w-full" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="peer flex min-h-screen bg-background md:ml-[var(--sidebar-width-icon)] data-[state=expanded]:md:ml-[var(--sidebar-width)] transition-all duration-200 ease-linear">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative overflow-x-hidden"> 
        <AppHeader
          projects={projects} selectedProjectId={selectedProjectId} onProjectChange={setSelectedProjectId}
          onAddTask={() => {
            if (openCreateTaskDialog && canAddTask) {
              if (!selectedProjectId && projects.length > 0) { alert("Please select or create a project first to add a task."); return; }
              if (projects.length === 0) { alert("Please create a project first to add a task."); return; }
              const defaultStatusForNewTask = BACKLOG_STATUS_ID;
              openCreateTaskDialog(defaultStatusForNewTask, undefined, selectedProjectId, DEFAULT_ISSUE_TYPE);
            } else if (!canAddTask) {
                alert("You do not have permission to add tasks.");
            }
          }}
          onAddProject={() => {
              if (canCreateProject) {
                setIsCreateProjectDialogOpen(true)
              } else {
                alert("You do not have permission to create projects.");
              }
          }}
          onToggleNotifications={handleToggleNotifications}
        />
        <main className="flex-1 p-0 md:p-0 lg:p-0 overflow-x-auto"> {children} </main>
      </div>
      {canCreateProject && (
        <CreateProjectDialog
            isOpen={isCreateProjectDialogOpen}
            onOpenChange={setIsCreateProjectDialogOpen}
            onProjectSubmit={handleProjectSubmit}
            users={users}
            teams={teams}
        />
      )}
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useRequireAuth();
  const { appUser } = useAuth();

  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [defaultStatusForNewTask, setDefaultStatusForNewTask] = useState<string>(BACKLOG_STATUS_ID);
  const [currentDefaultProjectIdForTask, setCurrentDefaultProjectIdForTask] = useState<string | null>(null);
  const [currentDefaultIssueTypeForTask, setCurrentDefaultIssueTypeForTask] = useState<IssueType>(DEFAULT_ISSUE_TYPE);


  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false); // Single state for sprint dialog
  const [sprintToEdit, setSprintToEdit] = useState<Sprint | null>(null); // To hold sprint for editing
  const [defaultProjectIdForNewSprint, setDefaultProjectIdForNewSprint] = useState<string | null>(null); // For new sprints


  const [isViewTaskDialogOpen, setIsViewTaskDialogOpen] = useState(false);
  const [taskToView, setTaskToView] = useState<Task | null>(null);

  const [isRenameProjectDialogOpen, setIsRenameProjectDialogOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);

  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);

  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [userToEditState, setUserToEditState] = useState<User | null>(null);

  const [isSprintRetrospectiveDialogOpen, setIsSprintRetrospectiveDialogOpen] = useState(false);
  const [sprintForRetrospective, setSprintForRetrospective] = useState<Sprint | null>(null);

  const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false);
  const [isCreateThreadDialogOpen, setIsCreateThreadDialogOpen] = useState(false);
  const [currentChannelIdForThread, setCurrentChannelIdForThread] = useState<string | null>(null);

  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);

  const openCreateTaskDialogHandler = useCallback((status?: string, task?: Task, projectId?: string | null, issueType?: IssueType) => {
    setTaskToEdit(task || null);
    setDefaultStatusForNewTask(status || (task?.status) || BACKLOG_STATUS_ID);
    setCurrentDefaultProjectIdForTask(projectId || task?.projectId || null);
    setCurrentDefaultIssueTypeForTask(issueType || task?.issueType || DEFAULT_ISSUE_TYPE);
    setIsCreateTaskDialogOpen(true);
  }, []);

  const openSprintDialogHandler = useCallback((projectId?: string | null, sprint?: Sprint | null) => {
    if (sprint) { // Editing existing sprint
      setSprintToEdit(sprint);
      setDefaultProjectIdForNewSprint(sprint.projectId); // projectId should already be part of sprint
    } else { // Creating new sprint
      setSprintToEdit(null);
      setDefaultProjectIdForNewSprint(projectId || null);
    }
    setIsSprintDialogOpen(true);
  }, []);


  const openViewTaskDialogHandler = useCallback((task: Task) => { setTaskToView(task); setIsViewTaskDialogOpen(true); }, []);
  const openRenameProjectDialogHandler = useCallback((project: Project) => { setProjectToRename(project); setIsRenameProjectDialogOpen(true); }, []);
  const openCreateTeamDialogHandler = useCallback((team?: Team) => { setTeamToEdit(team || null); setIsCreateTeamDialogOpen(true); }, []);
  const openCreateUserDialogHandler = useCallback((userToEditParam?: User) => { setUserToEditState(userToEditParam || null); setIsCreateUserDialogOpen(true); }, []);
  const openSprintRetrospectiveDialogHandler = useCallback((sprint: Sprint) => { setSprintForRetrospective(sprint); setIsSprintRetrospectiveDialogOpen(true); }, []);
  const openCreateChannelDialogHandler = useCallback(() => { setIsCreateChannelDialogOpen(true); }, []);
  const openCreateThreadDialogHandler = useCallback((channelId: string) => { setCurrentChannelIdForThread(channelId); setIsCreateThreadDialogOpen(true); }, []);
  const openNotificationsPanelHandler = useCallback(() => setIsNotificationsPanelOpen(prev => !prev), []);

  if (authLoading || !user) {
    return (
       <div className="flex items-center justify-center min-h-screen">
           <Skeleton className="h-12 w-12 rounded-full" />
           <div className="space-y-2 ml-4">
               <Skeleton className="h-4 w-[250px]" />
               <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
    );
  }

  return (
    <AppDataProvider
        openCreateTaskDialog={openCreateTaskDialogHandler}
        openCreateSprintDialog={openSprintDialogHandler} // Use the unified handler
        openViewTaskDialog={openViewTaskDialogHandler}
        openRenameProjectDialog={openRenameProjectDialogHandler}
        openCreateTeamDialog={openCreateTeamDialogHandler}
        openCreateUserDialog={openCreateUserDialogHandler}
        openSprintRetrospectiveDialog={openSprintRetrospectiveDialogHandler}
        openCreateChannelDialog={openCreateChannelDialogHandler}
        openCreateThreadDialog={openCreateThreadDialogHandler}
        openNotificationsPanel={openNotificationsPanelHandler}
    >
      <SidebarProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
        <CreateTaskDialogRenderer isOpen={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen} taskToEdit={taskToEdit} defaultStatus={defaultStatusForNewTask} defaultProjectId={currentDefaultProjectIdForTask} defaultIssueType={currentDefaultIssueTypeForTask} />
        <SprintDialogRenderer isOpen={isSprintDialogOpen} onOpenChange={setIsSprintDialogOpen} sprintToEdit={sprintToEdit} defaultProjectIdForNew={defaultProjectIdForNewSprint} />
        <ViewTaskDialogRenderer isOpen={isViewTaskDialogOpen} onOpenChange={setIsViewTaskDialogOpen} taskToView={taskToView} />
        <RenameProjectDialogRenderer isOpen={isRenameProjectDialogOpen} onOpenChange={setIsRenameProjectDialogOpen} projectToRename={projectToRename} />
        <CreateTeamDialogRenderer isOpen={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen} teamToEdit={teamToEdit} />
        <CreateUserDialogRenderer isOpen={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen} userToEdit={userToEditState} />
        <SprintRetrospectiveDialogRenderer isOpen={isSprintRetrospectiveDialogOpen} onOpenChange={setIsSprintRetrospectiveDialogOpen} sprintForRetrospective={sprintForRetrospective} />
        <CreateChannelDialogRenderer isOpen={isCreateChannelDialogOpen} onOpenChange={setIsCreateChannelDialogOpen} />
        <CreateThreadDialogRenderer isOpen={isCreateThreadDialogOpen} onOpenChange={setIsCreateThreadDialogOpen} channelId={currentChannelIdForThread} />
        <NotificationsPanelRenderer isOpen={isNotificationsPanelOpen} onOpenChange={setIsNotificationsPanelOpen} />
      </SidebarProvider>
    </AppDataProvider>
  );
}

interface CreateTaskDialogRendererProps { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; taskToEdit: Task | null; defaultStatus: string; defaultProjectId: string | null; defaultIssueType: IssueType; }
function CreateTaskDialogRenderer({ isOpen, onOpenChange, taskToEdit, defaultStatus, defaultProjectId, defaultIssueType }: CreateTaskDialogRendererProps) {
  const { tasks, addTask, updateTask, selectedProjectId } = useAppData(); 

  const handleDialogTaskSubmit = (submittedTaskData: TaskFormValues) => {
    const originalTask = taskToEdit ? tasks.find(t => t.id === taskToEdit.id) : undefined;
    if (taskToEdit) {
       const updatedTaskData: Task = {
          ...taskToEdit,
          ...submittedTaskData,
          dueDate: submittedTaskData.dueDate ? Timestamp.fromDate(submittedTaskData.dueDate) : undefined,
          subtasks: typeof submittedTaskData.subtasks === 'string'
            ? submittedTaskData.subtasks.split('\n').filter(s => s.trim() !== '')
            : [],
          storyPoints: submittedTaskData.storyPoints === null || submittedTaskData.storyPoints === undefined ? undefined : submittedTaskData.storyPoints,
          sprintId: submittedTaskData.sprintId === '@_NO_SPRINT_@' ? null : submittedTaskData.sprintId,
          projectId: submittedTaskData.projectId || defaultProjectId || selectedProjectId || undefined,
          parentStoryId: submittedTaskData.parentStoryId === '@_NO_PARENT_@' ? null : submittedTaskData.parentStoryId,
          epicId: submittedTaskData.epicId === '@_NO_PARENT_@' ? null : submittedTaskData.epicId,
      };
      updateTask(updatedTaskData, originalTask);
    } else {
       addTask(submittedTaskData, defaultStatus);
    }
  };
  const relevantProjectId = taskToEdit?.projectId || defaultProjectId || selectedProjectId;
  return ( <CreateTaskDialog isOpen={isOpen} onOpenChange={onOpenChange} onTaskSubmit={handleDialogTaskSubmit} taskToEdit={taskToEdit} defaultStatus={defaultStatus} defaultProjectId={relevantProjectId} defaultIssueType={defaultIssueType} /> );
}


interface SprintDialogRendererProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sprintToEdit: Sprint | null;
  defaultProjectIdForNew: string | null;
}
function SprintDialogRenderer({ isOpen, onOpenChange, sprintToEdit, defaultProjectIdForNew }: SprintDialogRendererProps) {
    const { selectedProjectId: contextSelectedProjectId } = useAppData();
    const relevantProjectId = sprintToEdit?.projectId || defaultProjectIdForNew || contextSelectedProjectId;
    return ( <CreateSprintDialog isOpen={isOpen} onOpenChange={onOpenChange} sprintToEdit={sprintToEdit} defaultProjectId={relevantProjectId} /> );
}

interface ViewTaskDialogRendererProps { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; taskToView: Task | null; }
function ViewTaskDialogRenderer({ isOpen, onOpenChange, taskToView }: ViewTaskDialogRendererProps) {
  const { users, projects, sprints, teams, tasks: allTasks } = useAppData();
  return ( <ViewTaskDialog isOpen={isOpen} onOpenChange={onOpenChange} task={taskToView} users={users} projects={projects} sprints={sprints} teams={teams} allTasks={allTasks} /> );
}

interface RenameProjectDialogRendererProps { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; projectToRename: Project | null; }
function RenameProjectDialogRenderer({ isOpen, onOpenChange, projectToRename }: RenameProjectDialogRendererProps) {
  const { updateProject, users, teams } = useAppData();
  const handleProjectRenameSubmit = (renamedProjectData: ProjectFormValues) => {
    if (projectToRename) {
      updateProject({
        ...projectToRename,
        name: renamedProjectData.name,
        description: renamedProjectData.description,
        allowedUserIds: renamedProjectData.allowedUserIds || projectToRename.allowedUserIds || [],
        allowedTeamIds: renamedProjectData.allowedTeamIds || projectToRename.allowedTeamIds || [],
      });
    }
  };
  return ( <RenameProjectDialog isOpen={isOpen} onOpenChange={onOpenChange} projectToRename={projectToRename} onProjectSubmit={handleProjectRenameSubmit} users={users} teams={teams}/> );
}

interface CreateTeamDialogRendererProps { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; teamToEdit: Team | null; }
function CreateTeamDialogRenderer({ isOpen, onOpenChange, teamToEdit }: CreateTeamDialogRendererProps) {
  const { addTeam, updateTeam } = useAppData();
  const handleTeamSubmit = (teamData: TeamFormValues) => {
    if (teamToEdit) { updateTeam({ ...teamToEdit, ...teamData }); }
    else { addTeam(teamData); }
  };
  return ( <CreateTeamDialog isOpen={isOpen} onOpenChange={onOpenChange} onTeamSubmit={handleTeamSubmit} teamToEdit={teamToEdit} /> );
}

interface CreateUserDialogRendererProps { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; userToEdit: User | null; }
function CreateUserDialogRenderer({ isOpen, onOpenChange, userToEdit }: CreateUserDialogRendererProps) {
  const { addUser, updateUser, teams } = useAppData();
  const { appUser } = useAuth();

  const handleUserSubmit = (userData: UserFormValues) => {
    if (!appUser || appUser.role !== 'Administrator') {
      alert("You do not have permission to manage user profiles.");
      return;
    }
    if (userToEdit && userToEdit.id === appUser.id && userData.role !== appUser.role) {
       alert("Administrators cannot change their own role through this dialog.");
       return;
    }
    if (userData.role === 'Administrator' && appUser.role !== 'Administrator') {
       alert("You do not have permission to assign Administrator role.");
       return;
    }

    if (userToEdit) { updateUser({ ...userToEdit, ...userData, role: userData.role || userToEdit.role }); }
    else { addUser(userData); }
  };
  return ( <CreateUserDialog isOpen={isOpen} onOpenChange={onOpenChange} onUserSubmit={handleUserSubmit} userToEdit={userToEdit} teams={teams} /> );
}

interface SprintRetrospectiveDialogRendererProps { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; sprintForRetrospective: Sprint | null; }
function SprintRetrospectiveDialogRenderer({ isOpen, onOpenChange, sprintForRetrospective }: SprintRetrospectiveDialogRendererProps) {
  const { updateSprint, sprints } = useAppData();
  const handleRetrospectiveSubmit = (sprintId: string, notes: string) => {
    if (sprintForRetrospective && sprintForRetrospective.id === sprintId) {
      const originalSprint = sprints.find(s => s.id === sprintId);
      updateSprint({ ...sprintForRetrospective, retrospectiveNotes: notes }, originalSprint);
    }
  };
  return ( <SprintRetrospectiveDialog isOpen={isOpen} onOpenChange={onOpenChange} sprint={sprintForRetrospective} onSubmitRetrospective={handleRetrospectiveSubmit} /> );
}

interface CreateChannelDialogRendererProps { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; }
function CreateChannelDialogRenderer({ isOpen, onOpenChange }: CreateChannelDialogRendererProps) {
  const { addChatChannel } = useAppData();
  const handleChannelSubmit = (channelData: ChatChannelFormValues) => {
    addChatChannel(channelData);
  };
  return ( <CreateChannelDialog isOpen={isOpen} onOpenChange={onOpenChange} onChannelSubmit={handleChannelSubmit} />);
}

interface CreateThreadDialogRendererProps { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; channelId: string | null; }
function CreateThreadDialogRenderer({ isOpen, onOpenChange, channelId }: CreateThreadDialogRendererProps) {
  const { addChatThread } = useAppData();
  const { user: authUser } = useAuth();

  const handleThreadSubmit = (threadData: ChatThreadFormValues) => {
    if (channelId && authUser) {
      addChatThread(channelId, threadData, authUser.uid);
    } else {
        console.error("Cannot add thread: Missing channel ID or user ID.");
    }
  };
  if (!channelId && isOpen) return null;
  return ( <CreateThreadDialog isOpen={isOpen} onOpenChange={onOpenChange} onThreadSubmit={handleThreadSubmit} channelId={channelId!} /> );
}

interface NotificationsPanelRendererProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}
function NotificationsPanelRenderer({ isOpen, onOpenChange }: NotificationsPanelRendererProps) {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, users } = useAppData();
  const { appUser } = useAuth();

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    if (appUser) {
      markAllNotificationsAsRead(appUser.id);
    }
  };

  return (
    <NotificationsPanel
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      notifications={notifications}
      users={users}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
    />
  );
}
