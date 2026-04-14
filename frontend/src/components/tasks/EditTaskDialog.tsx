"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
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

type EditTaskDialogProps = {
  task: Task;
};

export default function EditTaskDialog({ task }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [projectId, setProjectId] = useState(task.projectId);
  const [priority, setPriority] = useState<Task["priority"]>(task.priority);
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined
  );
  const queryClient = useQueryClient();

  const resetForm = () => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setProjectId(task.projectId);
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
  };

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () =>
      api.get<{ projects: Project[] }>("/projects").then((res) => res.data.projects || []),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/tasks/${task._id}`, {
        title,
        description,
        projectId,
        priority,
        status,
        dueDate: dueDate?.toISOString() ?? null,
      }),
    onSuccess: (response) => {
      const updatedTask = response.data.task as Task;

      queryClient.setQueryData<Task[]>(queryKeys.tasks, (current = []) =>
        current.map((currentTask) =>
          currentTask._id === updatedTask._id ? updatedTask : currentTask
        )
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      toast.success("Task updated");
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-gray-500 hover:text-indigo-600"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Task</DialogTitle>
        </DialogHeader>
        <TaskFormFields
          values={{ title, description, projectId, priority, status, dueDate }}
          projects={projects}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onProjectChange={setProjectId}
          onPriorityChange={setPriority}
          onStatusChange={setStatus}
          onDueDateChange={setDueDate}
          includeStatus
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title || !projectId || mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
