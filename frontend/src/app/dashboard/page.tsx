// src/app/dashboard/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, CheckSquare, Calendar } from "lucide-react";
import Link from "next/link";

export default function DashboardHome() {
  const { user, currentOrg } = useAuthStore();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects").then(res => res.data.projects || []),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then(res => res.data.tasks || []),
  });

  const tasksInProgress = tasks.filter((t: any) => t.status === "IN_PROGRESS").length;
  const dueThisWeek = tasks.filter((t: any) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= now && due <= weekFromNow;
  }).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome back, {user?.name.split(" ")[0]}!
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          You're in <span className="font-semibold">{currentOrg?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
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

        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
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

        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
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
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-10 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg opacity-90 mb-8">
            Create your first project and invite your team.
          </p>
          <Link href="/dashboard/projects">
            <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
              <Plus className="mr-2 h-5 w-5" />
              Create First Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-lg text-gray-600">You're all set! Head to projects to get work done.</p>
          <Link href="/dashboard/projects">
            <Button size="lg" className="mt-6">
              Go to Projects
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}