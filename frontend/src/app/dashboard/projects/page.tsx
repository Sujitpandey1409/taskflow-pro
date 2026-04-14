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

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () =>
      api.get<{ projects: Project[] }>("/projects").then((res) => res.data.projects || []),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: () => api.get<{ tasks: Task[] }>("/tasks").then((res) => res.data.tasks || []),
  });

  if (isLoading) {
    return <div className="py-32 text-center text-gray-500">Loading your projects...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Projects</h1>
            <p className="mt-2 text-lg text-gray-600">Manage all your work in one place</p>
          </div>

          <div className="flex gap-3">
            <CreateTaskDialog />
            <CreateProjectDialog />
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="py-32 text-center">
          <div className="mb-8 inline-flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
            <FolderKanban className="h-16 w-16 text-indigo-600" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-800">No projects yet</h2>
          <p className="mx-auto max-w-md text-xl text-gray-600">
            Get started by creating your first project. This is where all the work begins.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <h3 className="text-xl font-semibold text-gray-900 transition-colors group-hover:text-indigo-600">
                        {project.name}
                      </h3>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100">
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
