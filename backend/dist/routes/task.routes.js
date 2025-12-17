"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/task.routes.ts
const express_1 = require("express");
const task_controller_1 = require("../controllers/task.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect, tenant_middleware_1.loadTenantDB);
router.get('/', task_controller_1.getTasks);
router.post('/', task_controller_1.createTask);
exports.default = router;
