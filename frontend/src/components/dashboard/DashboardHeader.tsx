// src/components/dashboard/DashboardHeader.tsx
"use client";

import { useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

type DashboardHeaderProps = {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

export default function DashboardHeader({
  isSidebarCollapsed,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const { user, currentOrg } = useAuthStore();

  return (
    <header className="border-b border-gray-200 bg-white px-4 py-4 pl-16 sm:px-6 sm:pl-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-gray-900 sm:text-2xl">
              {currentOrg?.name}
            </h1>
            <p className="text-xs text-gray-500 sm:text-sm">Multi-tenant workspace</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                  {user?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
