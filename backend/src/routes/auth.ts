import { Router } from 'express';
import {
    signup,
    login,
    getMe,
    signupValidation,
    loginValidation,
} from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

// POST /api/auth/signup
router.post('/signup', signupValidation, signup);

// POST /api/auth/login
router.post('/login', loginValidation, login);

// GET /api/auth/me (protected)
router.get('/me', protect, getMe);

export default router;
