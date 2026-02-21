import { Router } from 'express';
import {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    createProjectValidation,
} from '../controllers/projectController';
import { protect } from '../middleware/auth';

const router = Router();

// GET  /api/projects        — public listing (filter by skills/status/search)
router.get('/', protect, getProjects);

// GET  /api/projects/:id    — get single project
router.get('/:id', protect, getProjectById);

// POST /api/projects        — create project (protected)
router.post('/', protect, createProjectValidation, createProject);

// PUT  /api/projects/:id    — update project (owner only)
router.put('/:id', protect, updateProject);

// DELETE /api/projects/:id  — delete project (owner only)
router.delete('/:id', protect, deleteProject);

export default router;
