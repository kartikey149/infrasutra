import express from 'express';
import {
  createSupervisor,
  getSupervisors,
  assignProjectsToSupervisor,
} from '../controllers/supervisorController.js';

const router = express.Router();

// POST /api/supervisors - Create new supervisor (Guaranteed 0 projects by default)
router.post('/', createSupervisor);

// GET /api/supervisors - Get all supervisors
router.get('/', getSupervisors);

// PUT /api/supervisors/:id/assign - Assign specific project IDs
router.put('/:id/assign', assignProjectsToSupervisor);

export default router;
