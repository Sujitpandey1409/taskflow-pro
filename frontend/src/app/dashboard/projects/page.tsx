"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { Project, Task } from "@/types/domain";
import { Card } from "@/components/ui/card";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import { useAuthStore } from "@/store/authStore";

export default function ProjectsPage() {
  const currentOrg = useAuthStore((state) => state.currentOrg);
  const orgId = currentOrg?.id;

  const { data: projects = [], isLoading } = useQuery({
    queryKey: queryKeys.projects(orgId),
    queryFn: () =>
      api.get<{ projects: Project[] }>("/projects").then((res) => res.data.projects || []),
    enabled: Boolean(orgId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: queryKeys.tasks(orgId),
    queryFn: () => api.get<{ tasks: Task[] }>("/tasks").then((res) => res.data.tasks || []),
    enabled: Boolean(orgId),
  });

  if (isLoading) {
    return <div className="py-32 text-center text-gray-500">Loading your projects...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 sm:mb-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Projects</h1>
            <p className="mt-2 text-base text-gray-600 sm:text-lg">Manage all your work in one place</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <CreateTaskDialog />
            <CreateProjectDialog />
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="py-20 text-center sm:py-32">
          <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 sm:mb-8 sm:h-32 sm:w-32">
            <FolderKanban className="h-12 w-12 text-indigo-600 sm:h-16 sm:w-16" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-gray-800 sm:text-3xl">No projects yet</h2>
          <p className="mx-auto max-w-md text-base text-gray-600 sm:text-xl">
            Get started by creating your first project. This is where all the work begins.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => {
            const taskCount = tasks.filter((task) => task.projectId === project._id).length;

            return (
              <Link
                key={project._id}
                href={`/dashboard/projects/${project._id}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4 rounded-xl"
              >
                <Card className="group relative cursor-pointer overflow-hidden border-0 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />

                  <div className="p-5 sm:p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-indigo-600 sm:text-xl">
                        {project.name}
                      </h3>
                      <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                        <FolderKanban className="h-5 w-5 text-white" />
                      </div>
                    </div>

                    <p className="mb-6 line-clamp-2 text-sm text-gray-600">
                      {project.description || "No description added"}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium capitalize text-green-600">
                          {project.status.toLowerCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{taskCount} tasks</span>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-6 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="w-full text-center font-medium text-white">Open project</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
