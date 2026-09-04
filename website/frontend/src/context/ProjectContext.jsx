import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE } from '../config';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [loading, setLoading] = useState(false);

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
          setProjects(data.projects);
          setActiveProjectId((prev) => {
            if (prev && data.projects.some((p) => p.id === prev)) {
              return prev;
            }
            return data.projects[0]?.id || null;
          });
        }
      } else {
        setProjects([]);
        setActiveProjectId(null);
      }
    } catch (err) {
      console.warn('Backend API unreachable; loading Standalone Projects:', err);
      try {
        const stored = localStorage.getItem('sih_infrasutra_projects_v2');
        let allProjects = stored ? JSON.parse(stored) : [
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
        localStorage.setItem('sih_infrasutra_projects_v2', JSON.stringify(allProjects));

        // Filter projects if supervisor role
        if (user?.roleKey === 'supervisor') {
          const filtered = allProjects.filter(p => 
            p.supervisor_id === user.id || 
            (user.name && p.supervisor && p.supervisor.toLowerCase().includes(user.name.toLowerCase()))
          );
          setProjects(filtered);
          setActiveProjectId(filtered[0]?.id || null);
        } else {
          setProjects(allProjects);
          setActiveProjectId(allProjects[0]?.id || null);
        }
      } catch (fallbackErr) {
        console.error('Failed to load fallback projects:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, [token, user]);

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
      // Update in localStorage
      const stored = JSON.parse(localStorage.getItem('sih_infrasutra_projects_v2') || '[]');
      const merged = stored.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p);
      localStorage.setItem('sih_infrasutra_projects_v2', JSON.stringify(merged));
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
      const stored = JSON.parse(localStorage.getItem('sih_infrasutra_projects_v2') || '[]');
      const newId = `PRJ-0${stored.length + 1}`;
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
        projectManager: user?.name || 'Project Planner',
        safetyOfficer: 'HSE Lead',
        workersOnSite: 25
      };
      stored.push(projectObj);
      localStorage.setItem('sih_infrasutra_projects_v2', JSON.stringify(stored));
      setProjects(prev => [...prev, projectObj]);
      setActiveProjectId(newId);
      return projectObj;
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
