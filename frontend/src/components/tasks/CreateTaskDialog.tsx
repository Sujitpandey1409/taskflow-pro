"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { Project, Task } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TaskFormFields from "@/components/tasks/TaskFormFields";

export default function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("MEDIUM");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () =>
      api.get<{ projects: Project[] }>("/projects").then((res) => res.data.projects || []),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/tasks", {
        title,
        description,
        projectId,
        priority,
        dueDate: dueDate?.toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      toast.success("Task created successfully!");
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create task"),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setProjectId("");
    setPriority("MEDIUM");
    setDueDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          <Plus className="mr-2 h-5 w-5" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Task</DialogTitle>
        </DialogHeader>
        <TaskFormFields
          values={{ title, description, projectId, priority, dueDate }}
          projects={projects}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onProjectChange={setProjectId}
          onPriorityChange={setPriority}
          onDueDateChange={setDueDate}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!title || !projectId || mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
