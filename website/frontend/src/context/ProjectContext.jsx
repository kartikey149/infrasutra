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
      console.warn('Could not fetch projects from SQLite:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

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
      console.error('Failed to persist project update to SQLite:', err);
      throw err;
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
      console.error('Failed to add project to SQLite:', err);
      throw err;
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
