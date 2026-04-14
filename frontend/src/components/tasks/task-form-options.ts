import type { Task } from "@/types/domain";

export const priorityOptions: Array<{ label: string; value: Task["priority"] }> = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

export const statusOptions: Array<{ label: string; value: Task["status"] }> = [
  { label: "To Do", value: "TODO" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Done", value: "DONE" },
];
