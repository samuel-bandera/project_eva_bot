import { Router } from 'express';
import * as authController from '../../../controllers/auth.controller.js';
import { authRequired } from '../../../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login',    authController.login);
router.get('/me',        authRequired, authController.me);

export default router;