// src/components/dashboard/DashboardHome.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, CheckSquare, Calendar } from "lucide-react";
import Link from "next/link";
import { queryKeys } from "@/lib/queryKeys";
import type { Project, Task } from "@/types/domain";

export default function DashboardHome() {
  const { user, currentOrg } = useAuthStore();
  const orgId = currentOrg?.id;

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: queryKeys.projects(orgId),
    queryFn: () =>
      api.get<{ projects: Project[] }>("/projects").then((res) => res.data.projects || []),
    enabled: Boolean(orgId),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: queryKeys.tasks(orgId),
    queryFn: () =>
      api.get<{ tasks: Task[] }>("/tasks").then((res) => res.data.tasks || []),
    enabled: Boolean(orgId),
  });

  const tasksInProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const dueThisWeek = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= now && due <= weekFromNow;
  }).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 sm:mb-10">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Welcome back, {user?.name.split(" ")[0] || "there"}!
        </h1>
        <p className="mt-2 text-base text-gray-600 sm:text-xl">
          You&apos;re in <span className="font-semibold">{currentOrg?.name}</span>
        </p>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 md:mb-12">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-indigo-600">
                {projectsLoading ? "-" : projects.length}
              </h3>
              <p className="text-gray-600 mt-2">Active Projects</p>
            </div>
            <FolderKanban className="h-10 w-10 text-indigo-600 opacity-20" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-emerald-600">
                {tasksLoading ? "-" : tasksInProgress}
              </h3>
              <p className="text-gray-600 mt-2">Tasks In Progress</p>
            </div>
            <CheckSquare className="h-10 w-10 text-emerald-600 opacity-20" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-amber-600">
                {tasksLoading ? "-" : dueThisWeek}
              </h3>
              <p className="text-gray-600 mt-2">Due This Week</p>
            </div>
            <Calendar className="h-10 w-10 text-amber-600 opacity-20" />
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-center text-white sm:p-12">
          <h2 className="mb-4 text-3xl font-bold sm:mb-6 sm:text-4xl">Ready to get started?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-base opacity-90 sm:mb-10 sm:text-xl">
            Create your first project and invite your team to start collaborating.
          </p>
          <Link href="/dashboard/projects">
            <Button size="lg" className="bg-white px-6 py-5 text-base text-indigo-600 hover:bg-gray-100 sm:px-8 sm:py-6 sm:text-lg">
              <Plus className="mr-3 h-6 w-6" />
              Create Your First Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="py-12 text-center sm:py-16">
          <p className="mb-6 text-xl text-gray-700 sm:text-2xl">
            You&apos;re all set! Jump back into your work.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href="/dashboard/projects">
              <Button size="lg">View Projects</Button>
            </Link>
            <Link href="/dashboard/tasks">
              <Button size="lg" variant="outline">View All Tasks</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
