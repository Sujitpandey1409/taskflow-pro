// src/routes/task.routes.ts
import { Router } from 'express';
import { getTasks, createTask } from '../controllers/task.controller';
import { protect } from '../middleware/auth.middleware';
import { loadTenantDB } from '../middleware/tenant.middleware';

const router = Router();

router.use(protect, loadTenantDB);

router.get('/', getTasks);
router.post('/', createTask);

export default router;  