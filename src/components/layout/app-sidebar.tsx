
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SheetTitle,
  SidebarMenuSkeleton, // Added SidebarMenuSkeleton
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import type { Role } from '@/types';

const mainNavItems = [
  { href: '/dashboard', label: 'Kanban Board', icon: Icons.Dashboard, tooltip: 'Kanban Board', requiredRoles: ['User', 'Supervisor', 'Manager', 'Administrator'] as Role[] },
  { href: '/backlog', label: 'Backlog', icon: Icons.Backlog, tooltip: 'Project Backlog', requiredRoles: ['User', 'Supervisor', 'Manager', 'Administrator'] as Role[] },
  { href: '/epics', label: 'Epics', icon: Icons.IssueEpic, tooltip: 'Manage Epics', requiredRoles: ['User', 'Supervisor', 'Manager', 'Administrator'] as Role[] },
  { href: '/sprints', label: 'Sprints', icon: Icons.Sprint, tooltip: 'Sprint Planning', requiredRoles: ['User', 'Supervisor', 'Manager', 'Administrator'] as Role[] },
  { href: '/roadmap', label: 'Roadmap', icon: Icons.Roadmap, tooltip: 'Project Roadmap', requiredRoles: ['User', 'Supervisor', 'Manager', 'Administrator'] as Role[] },
  { href: '/chat', label: 'Chat', icon: Icons.Chat, tooltip: 'Team Chat', requiredRoles: ['User', 'Supervisor', 'Manager', 'Administrator'] as Role[] },
  { href: '/reports', label: 'Reports', icon: Icons.Reports, tooltip: 'Reports & Analytics', requiredRoles: ['Supervisor', 'Manager', 'Administrator'] as Role[] },
];

const settingsNavItems = [
 { href: '/projects', label: 'Manage Projects', icon: Icons.ProjectsPage, tooltip: 'Manage Projects', requiredRoles: ['Manager', 'Administrator'] as Role[] },
 { href: '/teams', label: 'Manage Teams', icon: Icons.Team, tooltip: 'Manage Teams', requiredRoles: ['Administrator'] as Role[] },
 { href: '/users', label: 'Manage Users', icon: Icons.Users, tooltip: 'Manage Users', requiredRoles: ['Administrator'] as Role[] },
];

export function AppSidebar() {
  const currentPathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const userRole = appUser?.role;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const createNavItems = (items: typeof mainNavItems | typeof settingsNavItems) => {
    return items
      .filter(item => userRole && item.requiredRoles.includes(userRole))
      .map((item) => {
        const active = isMounted ? (currentPathname === item.href || (currentPathname === '/' && item.href === '/dashboard')) : false;
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={{ children: item.tooltip, className: "bg-primary text-primary-foreground" }}
              className={cn(
                "group-data-[collapsible=icon]:justify-center",
                active && "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              <Link href={item.href}>
                <item.icon />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
    });
  };

  if (authLoading || !isMounted) {
      return (
         <Sidebar
            side="left"
            variant="sidebar"
            collapsible="icon"
            mobileSheetTitle={siteConfig.name}
            className="hidden md:flex"
         >
             <SidebarHeader className="p-4">
                 <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                    <Icons.Logo className="h-8 w-8 text-primary group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6" />
                 </div>
             </SidebarHeader>
             <SidebarContent className="p-2 space-y-1">
                 {[...Array(7)].map((_, i) => <SidebarMenuSkeleton key={`main-skel-${i}`} showIcon />)} {/* Adjusted for Epics */}
                 <SidebarSeparator className="my-4 group-data-[collapsible=icon]:my-2" />
                 {[...Array(3)].map((_, i) => <SidebarMenuSkeleton key={`settings-skel-${i}`} showIcon/>)}
            </SidebarContent>
        </Sidebar>
      );
  }


  return (
    <Sidebar
        side="left"
        variant="sidebar"
        collapsible="icon"
        mobileSheetTitle={siteConfig.name}
    >
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Icons.Logo className="h-8 w-8 text-primary group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6" />
          <span className="font-bold text-xl group-data-[collapsible=icon]:hidden">
            {siteConfig.name}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <SidebarMenu className="flex-grow">
          {createNavItems(mainNavItems)}
        </SidebarMenu>

        {appUser && (settingsNavItems.some(item => item.requiredRoles.includes(appUser.role))) && (
          <>
            <SidebarSeparator className="my-4 group-data-[collapsible=icon]:my-2" />
            <SidebarMenu>
              {createNavItems(settingsNavItems)}
            </SidebarMenu>
          </>
        )}
         <div className="mt-auto p-2 group-data-[collapsible=icon]:p-0">
            <SidebarMenuButton
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start group-data-[collapsible=icon]:justify-center"
                tooltip={{ children: "Logout", className: "bg-destructive text-destructive-foreground" }}
            >
              <Icons.LogOut />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </SidebarMenuButton>
         </div>
      </SidebarContent>
    </Sidebar>
  );
}
