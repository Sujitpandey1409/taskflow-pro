// src/controllers/project.controller.ts
import { Request, Response } from 'express';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const ProjectModel = req.tenantDB.Project;
    const projects = await ProjectModel.find();
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const ProjectModel = req.tenantDB.Project;

    const project = await ProjectModel.create({
      name,
      description,
      ownerId: req.user.userId,
    });

    res.status(201).json({ project });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};