"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, ListTodo } from "lucide-react";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { Project, Task } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () =>
      api.get<{ projects: Project[] }>("/projects").then((res) => res.data.projects || []),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: () => api.get<{ tasks: Task[] }>("/tasks").then((res) => res.data.tasks || []),
  });

  const project = projects.find((item) => item._id === projectId);
  const projectTasks = tasks.filter((task) => task.projectId === projectId);

  if (projectsLoading || tasksLoading) {
    return <div className="py-24 text-center text-gray-500">Loading project details...</div>;
  }

  if (!project) {
    return <div className="py-24 text-center text-gray-500">Project not found in this workspace.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card className="border-gray-200 p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              <FolderKanban className="h-4 w-4" />
              Project overview
            </div>
            <h1 className="mt-4 text-4xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-3 max-w-2xl text-lg text-gray-600">
              {project.description || "This project does not have a description yet."}
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{project.status}</Badge>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500">Total tasks</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{projectTasks.length}</p>
        </Card>
        <Card className="border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500">In progress</p>
          <p className="mt-3 text-3xl font-bold text-blue-600">
            {projectTasks.filter((task) => task.status === "IN_PROGRESS").length}
          </p>
        </Card>
        <Card className="border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500">Done</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {projectTasks.filter((task) => task.status === "DONE").length}
          </p>
        </Card>
      </div>

      <Card className="border-gray-200 p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <ListTodo className="h-5 w-5 text-indigo-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Tasks in this project</h2>
        </div>

        {projectTasks.length === 0 ? (
          <p className="text-gray-600">No tasks are attached to this project yet.</p>
        ) : (
          <div className="space-y-4">
            {projectTasks.map((task) => (
              <div
                key={task._id}
                className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{task.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{task.description || "No description added"}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{task.status}</Badge>
                  <Badge variant={task.priority === "URGENT" ? "destructive" : "outline"}>
                    {task.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
