// src/routes/project.routes.ts
import { Router } from 'express';
import { getProjects, createProject } from '../controllers/project.controller';
import { protect } from '../middleware/auth.middleware';
import { loadTenantDB } from '../middleware/tenant.middleware';

const router = Router();

// All project routes need: auth + tenant DB
router.use(protect, loadTenantDB);

router.get('/', getProjects);
router.post('/', createProject);

export default router;