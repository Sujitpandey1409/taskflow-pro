// src/app/dashboard/projects/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects").then(res => res.data.projects),
  });

  if (isLoading) {
    return <div className="text-center py-20">Loading projects...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <Button size="lg">
          <Plus className="mr-2 h-5 w-5" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderKanban className="mx-auto h-24 w-24 text-gray-300 mb-6" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">No projects yet</h2>
          <p className="text-gray-500">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Card key={project._id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
              <p className="text-gray-600">{project.description || "No description"}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">0 tasks</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Active
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}