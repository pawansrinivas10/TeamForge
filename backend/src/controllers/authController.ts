import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// ─── Validation Rules ─────────────────────────────────────────────────────────
export const signupValidation = [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase, and digit'),
    body('skills').optional().isArray().withMessage('Skills must be an array'),
];

export const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const handleValidationErrors = (req: Request, res: Response): boolean => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
        });
        return false;
    }
    return true;
};

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
export const signup = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!handleValidationErrors(req, res)) return;

    try {
        const { name, email, password, skills = [], bio = '', availability = 'available' } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('An account with this email already exists.', 409);
        }

        const user = await User.create({ name, email, password, skills, bio, availability });
        const token = generateToken(user._id.toString());

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                skills: user.skills,
                availability: user.availability,
                bio: user.bio,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!handleValidationErrors(req, res)) return;

    try {
        const { email, password } = req.body;

        // Explicitly select password (it has select: false on the model)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            throw new AppError('Invalid email or password.', 401);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new AppError('Invalid email or password.', 401);
        }

        const token = generateToken(user._id.toString());

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                skills: user.skills,
                availability: user.availability,
                bio: user.bio,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
export const getMe = async (
    req: Request & { user?: InstanceType<typeof User> },
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        res.status(200).json({
            success: true,
            user: req.user,
        });
    } catch (error) {
        next(error);
    }
};
