// src/components/dashboard/DashboardSidebar.tsx
"use client";

import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FolderKanban, label: "Projects", href: "/dashboard/projects" },
  { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
  { icon: Users, label: "Team", href: "/dashboard/team" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

type SidebarNavContentProps = {
  isCollapsed?: boolean;
  currentOrgName?: string;
  userName?: string;
  userEmail?: string;
  pathname: string;
  onLogout: () => Promise<void>;
  onToggleCollapse?: () => void;
};

function SidebarNavContent({
  isCollapsed = false,
  currentOrgName,
  userName,
  userEmail,
  pathname,
  onLogout,
  onToggleCollapse,
}: SidebarNavContentProps) {
  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      <div className={`border-b border-gray-200 ${isCollapsed ? "px-3 py-4" : "p-6"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between gap-3"}`}>
          <div className="min-w-0">
            <h2
              className={`bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text font-bold text-transparent ${
                isCollapsed ? "text-lg" : "text-2xl"
              }`}
            >
              {isCollapsed ? "TF" : "TaskFlow Pro"}
            </h2>
            {!isCollapsed ? (
              <p className="mt-1 truncate text-sm text-gray-500">{currentOrgName}</p>
            ) : null}
          </div>

          {onToggleCollapse ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>
      </div>

      <nav className={`flex-1 space-y-1 ${isCollapsed ? "p-2" : "p-4"}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`h-12 w-full text-left ${
                  isActive ? "bg-indigo-50 text-indigo-700" : ""
                } ${isCollapsed ? "justify-center px-0" : "justify-start"} ${
                  isCollapsed ? "rounded-2xl" : ""
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed ? item.label : null}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-gray-200 ${isCollapsed ? "p-3" : "p-4"}`}>
        <div className={`mb-4 flex items-center ${isCollapsed ? "justify-center" : ""}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white">
            {userName?.charAt(0) ?? "U"}
          </div>
          {!isCollapsed ? (
            <div className="ml-3 min-w-0">
              <p className="truncate font-medium text-gray-900">{userName}</p>
              <p className="truncate text-xs text-gray-500">{userEmail}</p>
            </div>
          ) : null}
        </div>
        <Link href="/login">
          <Button
            onClick={onLogout}
            variant="outline"
            className={`w-full ${isCollapsed ? "justify-center px-0" : ""}`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className={`h-4 w-4 ${isCollapsed ? "" : "mr-2"}`} />
            {!isCollapsed ? "Logout" : null}
          </Button>
        </Link>
      </div>
    </div>
  );
}

type DashboardSidebarProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

export default function DashboardSidebar({
  isCollapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const { user, currentOrg, logout } = useAuthStore();
  const pathname = usePathname();

  return (
    <>
      <div className={`hidden lg:flex lg:flex-col ${isCollapsed ? "lg:w-24" : "lg:w-64"}`}>
        <SidebarNavContent
          isCollapsed={isCollapsed}
          currentOrgName={currentOrg?.name}
          userName={user?.name}
          userEmail={user?.email}
          pathname={pathname}
          onLogout={logout}
          onToggleCollapse={onToggleCollapse}
        />
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 left-4 z-50 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarNavContent
            currentOrgName={currentOrg?.name}
            userName={user?.name}
            userEmail={user?.email}
            pathname={pathname}
            onLogout={logout}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
