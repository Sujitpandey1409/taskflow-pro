"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./config/db");
// add routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const project_routes_1 = __importDefault(require("./routes/project.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        "https://taskflow-pro-sujit.vercel.app"
    ],
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/api/auth', auth_routes_1.default);
app.use('/api/projects', project_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', mongo: 'connected', timestamp: new Date().toISOString() });
});
// Start server
const start = async () => {
    try {
        await (0, db_1.connectGlobalDB)();
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Backend MERN running on http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error(err);
    }
};
start();
