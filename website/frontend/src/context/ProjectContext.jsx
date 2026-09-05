import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE } from '../config';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Per-user localStorage key — prevents different planners from sharing the same store
  const userStorageKey = user?.id
    ? `sih_infrasutra_projects_v2_${user.id}`
    : 'sih_infrasutra_projects_v2';

  // Role-based filter: planners see only projects they manage, supervisors see only theirs
  const filterForCurrentUser = (allProjects) => {
    if (!Array.isArray(allProjects)) return [];
    if (user?.roleKey === 'supervisor') {
      return allProjects.filter(p =>
        p.supervisor_id === user.id ||
        (user.name && p.supervisor &&
          p.supervisor.toLowerCase().includes(user.name.toLowerCase()))
      );
    }
    if (user?.roleKey === 'manager' || user?.roleKey === 'planner') {
      return allProjects.filter(p =>
        user.name && p.projectManager &&
        p.projectManager.toLowerCase().includes(user.name.toLowerCase())
      );
    }
    return allProjects;
  };

  // Sync projects from active SQLite DB for the authenticated user only
  const refreshProjects = useCallback(async () => {
    if (!token) {
      setProjects([]);
      setActiveProjectId(null);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.projects)) {
          // Filter live API results so each planner sees only their own projects
          const filtered = filterForCurrentUser(data.projects);
          setProjects(filtered);
          setActiveProjectId((prev) => {
            if (prev && filtered.some((p) => p.id === prev)) {
              return prev;
            }
            return filtered[0]?.id || null;
          });
        }
      } else {
        setProjects([]);
        setActiveProjectId(null);
      }
    } catch (err) {
      console.warn('Backend API unreachable; loading Standalone Projects:', err);
      try {
        // Per-user key: each planner has their own isolated project list
        const stored = localStorage.getItem(userStorageKey);
        const globalStored = localStorage.getItem('sih_infrasutra_projects_v2');

        // Seed data: the source-of-truth defaults, keyed by projectManager
        const SEED_PROJECTS = [
          {
            id: 'PRJ-01',
            name: 'Sector 4 Crude Oil Pipeline Expansion',
            location: 'Upper Assam Basin (Dibrugarh)',
            budget: '₹45.2 Cr',
            startDate: '2026-01-10',
            endDate: '2026-11-30',
            supervisor: 'Ramesh Kumar (Supervisor 1)',
            supervisor_id: 1,
            status: 'Active Execution',
            progress: 38,
            varianceDays: -4,
            projectManager: 'Arvind Sharma (Lead Planner)',
            safetyOfficer: 'D. Gogoi',
            workersOnSite: 68
          },
          {
            id: 'PRJ-02',
            name: 'Assam Gas Processing Plant Unit-2',
            location: 'Duliajan Industrial Area',
            budget: '₹128.5 Cr',
            startDate: '2025-08-15',
            endDate: '2027-03-31',
            supervisor: 'Kartik Kesarwani (Supervisor 2)',
            supervisor_id: 2,
            status: 'Active Execution',
            progress: 62,
            varianceDays: +2,
            projectManager: 'Arvind Sharma (Lead Planner)',
            safetyOfficer: 'R. Saikia',
            workersOnSite: 142
          },
          {
            id: 'PRJ-03',
            name: 'Numaligarh Refined Products Dispatch Terminal',
            location: 'Golaghat District',
            budget: '₹64.8 Cr',
            startDate: '2026-03-01',
            endDate: '2026-12-15',
            supervisor: 'Kartik Kesarwani (Supervisor 2)',
            supervisor_id: 2,
            status: 'Active Execution',
            progress: 19,
            varianceDays: -8,
            projectManager: 'Arvind Sharma (Lead Planner)',
            safetyOfficer: 'M. Neog',
            workersOnSite: 54
          },
          {
            id: 'PRJ-04',
            name: 'Brahmaputra River Crossing HDD Pipeline',
            location: 'Sadiya Corridor',
            budget: '₹92.0 Cr',
            startDate: '2025-11-01',
            endDate: '2026-08-30',
            supervisor: 'Unassigned',
            supervisor_id: null,
            status: 'Mobilization',
            progress: 8,
            varianceDays: 0,
            projectManager: 'Dr. Priya Borthakur (Scheduling Lead)',
            safetyOfficer: 'H. Kalita',
            workersOnSite: 35
          }
        ];

        // Determine which projects to show:
        // - Start from per-user stored projects (projects THIS user explicitly created/modified)
        // - Merge with any seed-data projects that belong to this user (by projectManager name match)
        // - ALWAYS re-filter: never trust raw stored data which may be contaminated from old sessions
        const userCreatedProjects = stored ? JSON.parse(stored) : [];
        const globalProjects = globalStored ? JSON.parse(globalStored) : SEED_PROJECTS;

        // Combine: seed projects that belong to this user + user's own created projects
        const combinedProjects = [
          ...filterForCurrentUser(SEED_PROJECTS),
          ...userCreatedProjects.filter(p =>
            // Only include user-created projects (not seed IDs) to avoid duplicates
            !SEED_PROJECTS.some(seed => seed.id === p.id)
          )
        ];

        // Save the clean, filtered list back to per-user key
        localStorage.setItem(userStorageKey, JSON.stringify(combinedProjects));

        setProjects(combinedProjects);
        setActiveProjectId(combinedProjects[0]?.id || null);
      } catch (fallbackErr) {
        console.error('Failed to load fallback projects:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  // When user changes (different planner logs in), clear their per-user cache so
  // the clean seed+filter logic always runs fresh — eliminates stale cross-planner data.
  useEffect(() => {
    if (user?.id) {
      localStorage.removeItem(userStorageKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects, user?.id]);

  const activeProject =
    (Array.isArray(projects) && projects.find((p) => p && p.id === activeProjectId)) ||
    (Array.isArray(projects) && projects[0]) ||
    null;

  const updateProject = async (updatedProject) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${updatedProject.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProject),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update project');
      }
      if (data.success && data.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === data.project.id ? data.project : p))
        );
        return data.project;
      }
    } catch (err) {
      console.warn('Backend unavailable; updating project in Standalone Mode:', err);
      // Update in per-user localStorage
      const stored = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
      const merged = stored.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p);
      localStorage.setItem(userStorageKey, JSON.stringify(merged));
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p));
      return updatedProject;
    }
  };

  const addProject = async (newProj) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProj),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create project');
      }
      if (data.success && data.project) {
        setProjects((prev) => [...prev, data.project]);
        setActiveProjectId(data.project.id);
        return data.project;
      }
    } catch (err) {
      console.warn('Backend unavailable; creating project in Standalone Mode:', err);
      // Use per-user key; stamp projectManager with logged-in planner's name
      const stored = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
      const newId = `PRJ-${String(Date.now()).slice(-5)}`;
      const projectObj = {
        id: newId,
        name: newProj.name || 'New Infrastructure Project',
        location: newProj.location || 'Assam Sector',
        budget: newProj.budget || '₹50.0 Cr',
        startDate: newProj.startDate || '2026-01-01',
        endDate: newProj.endDate || '2026-12-31',
        supervisor: newProj.supervisor || 'Unassigned',
        supervisor_id: newProj.supervisor_id || null,
        status: 'Mobilization',
        progress: 0,
        varianceDays: 0,
        // Always stamp the logged-in planner as creator so filtering works correctly
        projectManager: user?.name || 'Project Planner',
        safetyOfficer: newProj.safetyOfficer || 'HSE Lead',
        workersOnSite: newProj.workersOnSite || 25,
        description: newProj.description || '',
        priority: newProj.priority || 'High',
        contractType: newProj.contractType || 'EPC (Lump Sum)',
        clientName: newProj.clientName || 'Oil India Limited',
        department: newProj.department || '',
        contractor: newProj.contractor || '',
        createdBy: user?.id,
      };
      stored.push(projectObj);
      localStorage.setItem(userStorageKey, JSON.stringify(stored));
      setProjects(prev => [...prev, projectObj]);
      setActiveProjectId(newId);
      return projectObj;
    }
  };

  const deleteProject = async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete project');
      }
      setProjects(prev => {
        const remaining = prev.filter(p => p.id !== id);
        if (activeProjectId === id) {
          setActiveProjectId(remaining[0]?.id || null);
        }
        return remaining;
      });
      return data;
    } catch (err) {
      console.warn('Backend unavailable; deleting project locally:', err);
      const stored = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
      const filtered = stored.filter(p => p.id !== id);
      localStorage.setItem(userStorageKey, JSON.stringify(filtered));
      setProjects(prev => {
        const remaining = prev.filter(p => p.id !== id);
        if (activeProjectId === id) {
          setActiveProjectId(remaining[0]?.id || null);
        }
        return remaining;
      });
      return { success: true };
    }
  };

  const abandonProject = async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${id}/abandon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to abandon project');
      }
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Shut Down' } : p));
      return data;
    } catch (err) {
      console.warn('Backend unavailable; shutting down project locally:', err);
      const stored = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
      const updated = stored.map(p => p.id === id ? { ...p, status: 'Shut Down' } : p);
      localStorage.setItem(userStorageKey, JSON.stringify(updated));
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Shut Down' } : p));
      return { success: true };
    }
  };

  const switchProject = (id) => {
    setActiveProjectId(id);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeProjectId,
        switchProject,
        updateProject,
        addProject,
        deleteProject,
        abandonProject,
        refreshProjects,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
