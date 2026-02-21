import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// ─── Validation Rules ─────────────────────────────────────────────────────────
export const createProjectValidation = [
    body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
    body('description')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be 10–2000 characters'),
    body('requiredSkills')
        .isArray({ min: 1, max: 15 })
        .withMessage('Provide 1–15 required skills'),
    body('maxTeamSize').optional().isInt({ min: 1, max: 50 }),
];

// ─── GET /api/projects — List all open projects ───────────────────────────────
export const getProjects = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            skills,
            status,
            search,
            page = '1',
            limit = '20',
        } = req.query as Record<string, string>;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, parseInt(limit));

        const filter: Record<string, unknown> = {};

        if (skills) {
            filter.requiredSkills = { $in: skills.split(',').map((s) => s.trim()) };
        }
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.$text = { $search: search };
        }

        const [projects, total] = await Promise.all([
            Project.find(filter)
                .populate('createdBy', 'name email avatar')
                .populate('members', 'name avatar skills')
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            Project.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            projects,
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/projects/:id — Get single project ───────────────────────────────
export const getProjectById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('createdBy', 'name email bio avatar skills')
            .populate('members', 'name email bio avatar skills availability');

        if (!project) throw new AppError('Project not found', 404);

        res.status(200).json({ success: true, project });
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/projects — Create project ──────────────────────────────────────
export const createProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({ success: false, errors: errors.array() });
        return;
    }

    try {
        const { title, description, requiredSkills, tags = [], maxTeamSize = 5 } = req.body;

        const project = await Project.create({
            title,
            description,
            requiredSkills,
            tags,
            maxTeamSize,
            createdBy: req.user!._id,
            members: [req.user!._id], // Creator is first member
        });

        await project.populate('createdBy', 'name email avatar');

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            project,
        });
    } catch (error) {
        next(error);
    }
};

// ─── PUT /api/projects/:id — Update project ───────────────────────────────────
export const updateProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) throw new AppError('Project not found', 404);

        if (project.createdBy.toString() !== req.user!._id.toString()) {
            throw new AppError('You are not authorized to update this project', 403);
        }

        const allowedFields = ['title', 'description', 'requiredSkills', 'tags', 'maxTeamSize', 'status'];
        const updates: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        const updated = await Project.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email');

        res.status(200).json({ success: true, project: updated });
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /api/projects/:id — Delete project ───────────────────────────────
export const deleteProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) throw new AppError('Project not found', 404);

        if (project.createdBy.toString() !== req.user!._id.toString()) {
            throw new AppError('You are not authorized to delete this project', 403);
        }

        await project.deleteOne();
        res.status(200).json({ success: true, message: 'Project deleted successfully.' });
    } catch (error) {
        next(error);
    }
};
