import { Router } from 'express';
import {
    getUsers,
    getMyProfile,
    updateMyProfile,
    savePushToken,
    updateProfileValidation,
} from '../controllers/userController';
import { protect } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(protect);

// GET  /api/users          — list all users (with skill/availability filter)
router.get('/', getUsers);

// GET  /api/users/me       — get own profile
router.get('/me', getMyProfile);

// PATCH /api/users/me      — update own profile
router.patch('/me', updateProfileValidation, updateMyProfile);

// PATCH /api/users/push-token — save Expo push notification token
router.patch('/push-token', savePushToken);

export default router;
