"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { Project, Task } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { priorityOptions, statusOptions } from "@/components/tasks/task-form-options";

type TaskFormValues = {
  title: string;
  description: string;
  projectId: string;
  priority: Task["priority"];
  status?: Task["status"];
  dueDate?: Date;
};

type TaskFormFieldsProps = {
  values: TaskFormValues;
  projects: Project[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onPriorityChange: (value: Task["priority"]) => void;
  onStatusChange?: (value: Task["status"]) => void;
  onDueDateChange: (value: Date | undefined) => void;
  includeStatus?: boolean;
};

export default function TaskFormFields({
  values,
  projects,
  onTitleChange,
  onDescriptionChange,
  onProjectChange,
  onPriorityChange,
  onStatusChange,
  onDueDateChange,
  includeStatus = false,
}: TaskFormFieldsProps) {
  return (
    <div className="space-y-5 py-4">
      <div>
        <Label>Title</Label>
        <Input
          value={values.title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Design new landing page"
        />
      </div>

      <div>
        <Label>Description (optional)</Label>
        <Textarea
          value={values.description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Add details..."
          className="min-h-28"
        />
      </div>

      <div className={`grid gap-4 ${includeStatus ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <div>
          <Label>Project</Label>
          <Select value={values.projectId} onValueChange={onProjectChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project._id} value={project._id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Priority</Label>
          <Select value={values.priority} onValueChange={onPriorityChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {includeStatus && onStatusChange ? (
          <div>
            <Label>Status</Label>
            <Select value={values.status} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div>
        <Label>Due Date (optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !values.dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {values.dueDate ? format(values.dueDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={values.dueDate}
              onSelect={onDueDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
