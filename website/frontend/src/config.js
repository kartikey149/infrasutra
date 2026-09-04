/*
 * Centralized API Configuration for Infrasutra
 * Reads from VITE_API_BASE_URL when deployed (e.g. Netlify)
 * Defaults to local FastAPI backend (http://localhost:8000/api) in local development
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const BACKEND_URL = API_BASE.replace(/\/api$/, '');
