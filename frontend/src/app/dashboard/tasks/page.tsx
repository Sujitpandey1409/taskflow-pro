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

const columns = [
  { id: "TODO", title: "To Do", color: "bg-gray-100" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-100" },
  { id: "DONE", title: "Done", color: "bg-green-100" },
] as const;

export default function TasksPage() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: () => api.get<{ tasks: Task[] }>("/tasks").then((res) => res.data.tasks || []),
  });

  const updateTaskStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: Task["status"] }) =>
      api.patch(`/tasks/${taskId}`, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks) ?? [];

      queryClient.setQueryData<Task[]>(queryKeys.tasks, (current = []) =>
        current.map((task) => (task._id === taskId ? { ...task, status } : task))
      );

      return { previousTasks };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks, context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
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
    return <div className="p-10 text-center text-gray-500">Loading tasks...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-2 text-lg text-gray-600">Drag and drop to update status</p>
        </div>
        <CreateTaskDialog />
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columns.map((column) => (
            <div key={column.id} className={`min-w-80 rounded-xl p-4 ${column.color}`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{column.title}</h3>
                <Badge variant="secondary">
                  {tasks.filter((task) => task.status === column.id).length}
                </Badge>
              </div>

              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    className="min-h-96 space-y-3"
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
                                <h4 className="font-medium">{task.title}</h4>
                                <GripVertical className="h-5 w-5 text-gray-400" />
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
