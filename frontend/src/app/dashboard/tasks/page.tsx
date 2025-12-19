"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, Plus } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useState, useEffect } from "react";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";

const columns = [
  { id: "TODO", title: "To Do", color: "bg-gray-100" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-100" },
  { id: "DONE", title: "Done", color: "bg-green-100" },
];

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<any[]>([]);


  // Fetch tasks
  const { data: fetchedTasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then(res => res.data.tasks || []),
  });

  useEffect(() => {
  if (fetchedTasks && Array.isArray(fetchedTasks)) {
    setTasks((prev) => {
      // prevent infinite loop → only update if JSON actually changed
      if (JSON.stringify(prev) !== JSON.stringify(fetchedTasks)) {
        return fetchedTasks;
      }
      return prev;
    });
  }
}, [fetchedTasks]);


  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId;

    // Update UI Optimistically
    setTasks((prev) =>
      prev.map((t) =>
        t._id === draggableId ? { ...t, status: newStatus } : t
      )
    );

    try {
      await api.patch(`/tasks/${draggableId}`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500">Loading tasks...</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Tasks</h1>
          <p className="text-lg text-gray-600 mt-2">Drag and drop to update status</p>
        </div>
        <CreateTaskDialog />
      </div>

      {/* DND Context */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columns.map((column) => (
            <div
              key={column.id}
              className={`min-w-80 ${column.color} rounded-xl p-4`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">{column.title}</h3>
                <Badge variant="secondary">
                  {tasks.filter((t) => t.status === column.id).length}
                </Badge>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    className="space-y-3 min-h-96"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {tasks
                      .filter((task) => task.status === column.id)
                      .map((task, index) => (
                        <Draggable
                          key={task._id}
                          draggableId={task._id}
                          index={index}
                        >
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium">{task.title}</h4>
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>

                              {task.description && (
                                <p className="text-sm text-gray-600 mb-3">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2">
                                {task.priority && (
                                  <Badge
                                    variant={
                                      task.priority === "URGENT"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {task.priority}
                                  </Badge>
                                )}

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
