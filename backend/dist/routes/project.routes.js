"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/project.routes.ts
const express_1 = require("express");
const project_controller_1 = require("../controllers/project.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const router = (0, express_1.Router)();
// All project routes need: auth + tenant DB
router.use(auth_middleware_1.protect, tenant_middleware_1.loadTenantDB);
router.get('/', project_controller_1.getProjects);
router.post('/', project_controller_1.createProject);
exports.default = router;
