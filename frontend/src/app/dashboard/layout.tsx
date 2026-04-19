"use client";

import { useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ChatWidget from "@/components/chat/ChatWidget";
import ChatWidgetBoundary from "@/components/chat/ChatWidgetBoundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((value) => !value)}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <ChatWidgetBoundary>
        <ChatWidget />
      </ChatWidgetBoundary>
    </div>
  );
}
