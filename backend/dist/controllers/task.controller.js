"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTask = exports.getTasks = void 0;
const getTasks = async (req, res) => {
    try {
        const TaskModel = req.tenantDB.Task;
        const tasks = await TaskModel.find({ projectId: req.query.projectId || null });
        res.json({ tasks });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getTasks = getTasks;
const createTask = async (req, res) => {
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
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.createTask = createTask;
