// src/app/dashboard/projects/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Plus } from "lucide-react";
import CreateProjectDialog from "../../../components/projects/CreateProjectDialog";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects").then(res => res.data.projects || []),
  });

  if (isLoading) {
    return <div className="text-center py-32 text-gray-500">Loading your projects...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Projects</h1>
            <p className="text-lg text-gray-600 mt-2">
              Manage all your work in one place
            </p>
          </div>

          {/* Action Buttons — Beautifully Aligned */}
          <div className="flex gap-3">
            <CreateTaskDialog />
            <CreateProjectDialog />
          </div>
        </div>
      </div>

      {/* Empty State — Stunning */}
      {projects.length === 0 ? (
        <div className="text-center py-32">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-8">
            <FolderKanban className="h-16 w-16 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">No projects yet</h2>
          <p className="text-xl text-gray-600 max-w-md mx-auto">
            Get started by creating your first project. This is where all the magic begins.
          </p>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project: any) => (
            <Card
              key={project._id}
              className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white"
            >
              {/* Gradient Top Bar */}
              <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {project.name}
                  </h3>
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                </div>

                <p className="text-gray-600 text-sm line-clamp-2 mb-6">
                  {project.description || "No description added"}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <span className="text-sm text-gray-500">0 tasks</span>
                </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <p className="text-white font-medium">Click to open →</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}