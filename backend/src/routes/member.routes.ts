import express from 'express';
import { getMembers, inviteMember } from '../controllers/member.controller';
import { requireRole} from '../middleware/rbac.middleware';
import { protect } from '../middleware/auth.middleware';
import { loadTenantDB } from '../middleware/tenant.middleware';

const router = express.Router();

router.use(protect, loadTenantDB);

router.get('/', getMembers);
router.post('/invite', requireRole('ADMIN'), inviteMember);

export default router;
