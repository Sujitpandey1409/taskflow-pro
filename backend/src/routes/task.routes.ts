// src/routes/task.routes.ts
import { Router } from 'express';
import { getTasks, createTask, updateTask } from '../controllers/task.controller';
import { protect } from '../middleware/auth.middleware';
import { loadTenantDB } from '../middleware/tenant.middleware';

const router = Router();

router.use(protect, loadTenantDB);

router.get('/', getTasks);
router.post('/', createTask);
router.patch('/:id', updateTask);

export default router;  
