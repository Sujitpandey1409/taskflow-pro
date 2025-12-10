// src/routes/auth.routes.ts
import { Router } from 'express';
import { register } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
// router.post('/login', login);
// router.post('/refresh', refreshToken);
// router.post('/logout', logout);

export default router;