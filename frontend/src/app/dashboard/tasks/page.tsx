"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { Task } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import { useAuthStore } from "@/store/authStore";

const columns = [
  { id: "TODO", title: "To Do", color: "bg-gray-100" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-100" },
  { id: "DONE", title: "Done", color: "bg-green-100" },
] as const;

export default function TasksPage() {
  const currentOrg = useAuthStore((state) => state.currentOrg);
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: queryKeys.tasks(orgId),
    queryFn: () => api.get<{ tasks: Task[] }>("/tasks").then((res) => res.data.tasks || []),
    enabled: Boolean(orgId),
  });

  const updateTaskStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: Task["status"] }) =>
      api.patch(`/tasks/${taskId}`, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks(orgId) });
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks(orgId)) ?? [];

      queryClient.setQueryData<Task[]>(queryKeys.tasks(orgId), (current = []) =>
        current.map((task) => (task._id === taskId ? { ...task, status } : task))
      );

      return { previousTasks };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks(orgId), context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(orgId) });
    },
  });

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      await updateTaskStatus.mutateAsync({
        taskId: draggableId,
        status: destination.droppableId as Task["status"],
      });
    } catch {
      return;
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500 sm:p-10">Loading tasks...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Tasks</h1>
          <p className="mt-2 text-base text-gray-600 sm:text-lg">Drag and drop to update status</p>
        </div>
        <CreateTaskDialog />
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 pb-6 lg:grid-cols-3 lg:gap-6">
          {columns.map((column) => (
            <div key={column.id} className={`rounded-xl p-4 ${column.color}`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{column.title}</h3>
                <Badge variant="secondary">
                  {tasks.filter((task) => task.status === column.id).length}
                </Badge>
              </div>

              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    className="min-h-44 space-y-3 sm:min-h-72 lg:min-h-96"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {tasks
                      .filter((task) => task.status === column.id)
                      .map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(dragProvided) => (
                            <Card
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className="cursor-grab bg-white p-4 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                            >
                              <div className="mb-2 flex items-start justify-between">
                                <h4 className="pr-2 font-medium">{task.title}</h4>
                                <div className="flex items-center gap-1">
                                  <EditTaskDialog task={task} />
                                  <GripVertical className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>

                              {task.description && (
                                <p className="mb-3 text-sm text-gray-600">{task.description}</p>
                              )}

                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={task.priority === "URGENT" ? "destructive" : "secondary"}
                                >
                                  {task.priority}
                                </Badge>

                                {task.dueDate && (
                                  <Badge variant="outline">
                                    {new Date(task.dueDate).toLocaleDateString()}
                                  </Badge>
                                )}
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
