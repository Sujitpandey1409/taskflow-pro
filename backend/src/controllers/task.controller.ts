// src/controllers/task.controller.ts
import { Request, Response } from 'express';

export const getTasks = async (req: Request, res: Response) => {
  try {
    const TaskModel = req.tenantDB.Task;
    const tasks = await TaskModel.find({ projectId: req.query.projectId || null });
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