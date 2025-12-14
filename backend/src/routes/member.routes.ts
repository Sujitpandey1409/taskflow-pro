import express from 'express';
import { inviteMember } from '../controllers/member.controller';
import { requireRole} from '../middleware/rbac.middleware';
import { protect } from '../middleware/auth.middleware';
import { loadTenantDB } from '../middleware/tenant.middleware';

const router = express.Router();

router.use(protect, loadTenantDB);

router.post('/invite', requireRole('ADMIN'), inviteMember);

export default router;