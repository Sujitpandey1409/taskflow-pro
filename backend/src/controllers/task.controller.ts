// src/controllers/task.controller.ts
import { Request, Response } from 'express';

export const getTasks = async (req: Request, res: Response) => {
  try {
    const TaskModel = req.tenantDB.Task;
    const projectId = req.query.projectId;
    const query = projectId ? { projectId } : {};
    const tasks = await TaskModel.find(query);
    res.json({ tasks });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, projectId, priority, dueDate } = req.body;
    const TaskModel = req.tenantDB.Task;

    const task = await TaskModel.create({
      title,
      description,
      projectId,
      priority,
      dueDate,
      assignee: null, // later with members
      status: 'TODO',
    });

    res.status(201).json({ task });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const TaskModel = req.tenantDB.Task;

    const updatedTask = await TaskModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ task: updatedTask });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
