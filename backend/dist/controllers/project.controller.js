"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = exports.getProjects = void 0;
const getProjects = async (req, res) => {
    try {
        const ProjectModel = req.tenantDB.Project;
        const projects = await ProjectModel.find();
        res.json({ projects });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getProjects = getProjects;
const createProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        const ProjectModel = req.tenantDB.Project;
        const project = await ProjectModel.create({
            name,
            description,
            ownerId: req.user.userId,
        });
        res.status(201).json({ project });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.createProject = createProject;
