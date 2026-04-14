"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaskStatus = exports.createTask = exports.getTasks = void 0;
const getTasks = async (req, res) => {
    try {
        const TaskModel = req.tenantDB.Task;
        const projectId = req.query.projectId;
        const query = projectId ? { projectId } : {};
        const tasks = await TaskModel.find(query);
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
const updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const TaskModel = req.tenantDB.Task;
        const updatedTask = await TaskModel.findByIdAndUpdate(id, { status }, { new: true });
        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }
        res.json({ task: updatedTask });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.updateTaskStatus = updateTaskStatus;
