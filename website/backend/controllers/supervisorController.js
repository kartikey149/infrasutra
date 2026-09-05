import mongoose from 'mongoose';
import Supervisor from '../models/Supervisor.js';

// In-memory store fallback for environments where MongoDB is not running locally
const inMemorySupervisors = [];

/**
 * Controller: createSupervisor
 * 
 * BUG FIX EXPLANATION:
 * The bug occurred because controllers previously defaulted to assigning all available
 * project IDs or failed to validate the projects payload.
 * 
 * Here:
 * 1. `projects` is explicitly extracted from req.body.
 * 2. It is checked with `Array.isArray(projects) && projects.length > 0`.
 * 3. If no projects array is provided, or if empty/falsy, `assignedProjects` is STRICTLY set to `[]`.
 * 4. The supervisor is created with 0 assigned projects.
 */
export const createSupervisor = async (req, res) => {
  try {
    const { name, email, password, phone, specialization, role, projects } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required fields',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 2. CRITICAL BUG FIX: Enforce zero projects unless valid IDs are explicitly provided in request body
    const assignedProjects = Array.isArray(projects) && projects.length > 0 ? projects : [];

    // Check if MongoDB is connected
    const isMongoConnected = mongoose.connection && mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      // Check existing supervisor in MongoDB
      const existing = await Supervisor.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'A supervisor with this email address already exists',
        });
      }

      // Create new supervisor document with guaranteed zero projects by default
      const newSupervisor = await Supervisor.create({
        name: name.trim(),
        email: cleanEmail,
        password, // In full production, hash with bcrypt: await bcrypt.hash(password, 10)
        phone: phone ? phone.trim() : '',
        specialization: specialization || 'Civil & Pipeline',
        role: role || 'supervisor',
        projects: assignedProjects, // Strictly [] unless explicitly passed
        isActive: true,
      });

      return res.status(201).json({
        success: true,
        message: 'Supervisor created successfully with 0 assigned projects by default',
        supervisor: {
          id: newSupervisor._id,
          name: newSupervisor.name,
          email: newSupervisor.email,
          role: newSupervisor.role,
          phone: newSupervisor.phone,
          specialization: newSupervisor.specialization,
          projects: newSupervisor.projects,
          projectsCount: newSupervisor.projects.length,
          createdAt: newSupervisor.createdAt,
        },
      });
    } else {
      // In-memory fallback (preserves exact same logic and zero-project guarantee)
      const existing = inMemorySupervisors.find((s) => s.email === cleanEmail);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'A supervisor with this email address already exists',
        });
      }

      const newSupervisor = {
        id: `sup-${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        password,
        phone: phone ? phone.trim() : '',
        specialization: specialization || 'Civil & Pipeline',
        role: role || 'supervisor',
        projects: assignedProjects, // Strictly [] unless explicitly passed
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      inMemorySupervisors.push(newSupervisor);

      return res.status(201).json({
        success: true,
        message: 'Supervisor created successfully with 0 assigned projects by default (In-Memory/Local mode)',
        supervisor: {
          id: newSupervisor.id,
          name: newSupervisor.name,
          email: newSupervisor.email,
          role: newSupervisor.role,
          phone: newSupervisor.phone,
          specialization: newSupervisor.specialization,
          projects: newSupervisor.projects,
          projectsCount: newSupervisor.projects.length,
          createdAt: newSupervisor.createdAt,
        },
      });
    }
  } catch (error) {
    console.error('[createSupervisor Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error creating supervisor',
    });
  }
};

/**
 * Controller: getSupervisors
 * Returns all supervisors with their assigned project count
 */
export const getSupervisors = async (req, res) => {
  try {
    const isMongoConnected = mongoose.connection && mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const supervisors = await Supervisor.find()
        .select('-password')
        .populate('projects', 'name location status progress');

      return res.json({
        success: true,
        count: supervisors.length,
        supervisors,
      });
    } else {
      return res.json({
        success: true,
        count: inMemorySupervisors.length,
        supervisors: inMemorySupervisors.map(({ password, ...rest }) => rest),
      });
    }
  } catch (error) {
    console.error('[getSupervisors Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error fetching supervisors',
    });
  }
};

/**
 * Controller: assignProjectsToSupervisor
 * Explicitly assigns a list of project IDs to a supervisor
 */
export const assignProjectsToSupervisor = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectIds } = req.body;

    if (!Array.isArray(projectIds)) {
      return res.status(400).json({
        success: false,
        error: 'projectIds must be an array of project IDs',
      });
    }

    const isMongoConnected = mongoose.connection && mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const supervisor = await Supervisor.findByIdAndUpdate(
        id,
        { projects: projectIds },
        { new: true, runValidators: true }
      ).select('-password');

      if (!supervisor) {
        return res.status(404).json({ success: false, error: 'Supervisor not found' });
      }

      return res.json({
        success: true,
        message: 'Supervisor projects updated successfully',
        supervisor,
      });
    } else {
      const sup = inMemorySupervisors.find((s) => s.id === id);
      if (!sup) {
        return res.status(404).json({ success: false, error: 'Supervisor not found' });
      }
      sup.projects = projectIds;
      return res.json({
        success: true,
        message: 'Supervisor projects updated successfully',
        supervisor: { ...sup, password: undefined },
      });
    }
  } catch (error) {
    console.error('[assignProjectsToSupervisor Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error updating project assignments',
    });
  }
};
