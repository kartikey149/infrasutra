import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HardHat,
  Briefcase,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle
} from 'lucide-react';

import { API_BASE } from '../config';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || '/';

  // Toggle between 'login' and 'signup' mode
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState('manager'); // 'supervisor' | 'manager'
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fillScenario = (emailVal, roleVal) => {
    setEmail(emailVal);
    setPassword('12345678');
    setSelectedRole(roleVal);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isSignUp ? `${API_BASE}/auth/signup` : `${API_BASE}/auth/login`;
      const payload = isSignUp 
        ? { name, email, password, role: selectedRole }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.detail || 'Authentication failed. Check your credentials.');
      }

      // Save authenticated user & token in React context & localStorage
      login(data.user, data.token);
      navigate(from, { replace: true });

    } catch (err) {
      // If it's a network error (e.g. deployed on Netlify without public backend, or on mobile device)
      const isNetworkError = !err.message || 
        err.message.includes('fetch') || 
        err.message.includes('Network') || 
        err.message.includes('Failed to fetch') ||
        err.message.includes('Server unreachable');

      if (isNetworkError) {
        console.warn('Backend API unreachable; logging in using Standalone Client Mode:', err);
        
        const registeredUsers = JSON.parse(localStorage.getItem('sih_registered_users') || '[]');
        let authUser = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (isSignUp) {
          if (authUser) {
            setError('An account with this email address already exists.');
            setIsLoading(false);
            return;
          }
          authUser = {
            id: Date.now(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            role: selectedRole === 'supervisor' ? 'Site Supervisor' : 'Project Planner',
            roleKey: selectedRole === 'supervisor' ? 'supervisor' : 'manager'
          };
          registeredUsers.push(authUser);
          localStorage.setItem('sih_registered_users', JSON.stringify(registeredUsers));
        } else {
          // In login mode, check if registered user or benchmark accounts
          if (!authUser) {
            const benchmarkMap = {
              'planner1@oilindia.in': { name: 'Arvind Sharma (Lead Planner)', role: 'Project Planner', roleKey: 'manager' },
              'planner2@oilindia.in': { name: 'Dr. Priya Borthakur (Scheduling Lead)', role: 'Project Planner', roleKey: 'manager' },
              'supervisor1@oilindia.in': { name: 'Ramesh Kumar (Supervisor 1)', role: 'Site Supervisor', roleKey: 'supervisor' },
              'supervisor2@oilindia.in': { name: 'Kartik Kesarwani (Supervisor 2)', role: 'Site Supervisor', roleKey: 'supervisor' },
              'supervisor3@oilindia.in': { name: 'Sunil Baruah (Supervisor 3 - Unassigned)', role: 'Site Supervisor', roleKey: 'supervisor' }
            };
            const benchmark = benchmarkMap[email.toLowerCase()];
            if (benchmark) {
              authUser = {
                id: Date.now(),
                name: benchmark.name,
                email: email.toLowerCase(),
                role: benchmark.role,
                roleKey: benchmark.roleKey
              };
            } else {
              // Guest login session
              authUser = {
                id: Date.now(),
                name: email.split('@')[0],
                email: email.toLowerCase(),
                role: selectedRole === 'supervisor' ? 'Site Supervisor' : 'Project Planner',
                roleKey: selectedRole === 'supervisor' ? 'supervisor' : 'manager'
              };
            }
          }
        }

        const fallbackToken = 'token_' + btoa(JSON.stringify({ sub: authUser.id, role: authUser.roleKey, exp: Date.now() + 86400000 }));
        login(authUser, fallbackToken);
        navigate(from, { replace: true });
        return;
      }

      setError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-black mx-auto text-lg shadow-md shadow-slate-900/10">
            SIH
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isSignUp ? 'Create System Account' : 'Welcome Back'}
          </h1>
          <p className="text-xs text-slate-500">
            {isSignUp 
              ? 'Register with SQLite database for site access' 
              : 'Sign in to access the Oil India PS-122 execution platform'}
          </p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedRole('manager')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              selectedRole === 'manager'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase size={14} /> Project Planner
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('supervisor')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              selectedRole === 'supervisor'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <HardHat size={14} /> Site Supervisor
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isSignUp && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@oilindia.in"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-300 mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Register & Enter Dashboard' : 'Sign In to Workspace'}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Demo Creds Autofill (Only on Login) */}
        {!isSignUp && (
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-[11px]">
            <span className="text-slate-500 font-semibold">Test Project Isolation Scenarios:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => fillScenario('supervisor1@oilindia.in', 'supervisor')}
                className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold flex items-center justify-center gap-1 transition text-[10px]"
                title="Assigned to Project A (PRJ-01)"
              >
                <HardHat size={11} /> Supervisor 1 (Proj A)
              </button>
              <button
                type="button"
                onClick={() => fillScenario('supervisor2@oilindia.in', 'supervisor')}
                className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold flex items-center justify-center gap-1 transition text-[10px]"
                title="Assigned to Project B & C (PRJ-02, PRJ-03)"
              >
                <HardHat size={11} /> Supervisor 2 (B & C)
              </button>
              <button
                type="button"
                onClick={() => fillScenario('planner1@oilindia.in', 'manager')}
                className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center justify-center gap-1 transition text-[10px]"
                title="Planned Projects A, B, C"
              >
                <Briefcase size={11} /> Planner 1 (A, B, C)
              </button>
              <button
                type="button"
                onClick={() => fillScenario('planner2@oilindia.in', 'manager')}
                className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center justify-center gap-1 transition text-[10px]"
                title="Planned only Project D (PRJ-04)"
              >
                <Briefcase size={11} /> Planner 2 (Proj D)
              </button>
            </div>
            <button
              type="button"
              onClick={() => fillScenario('supervisor3@oilindia.in', 'supervisor')}
              className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 transition text-[10px]"
              title="Supervisor with 0 projects assigned (Empty State)"
            >
              <AlertCircle size={11} className="text-slate-400" /> Supervisor 3 (Unassigned / 0 Projects)
            </button>
          </div>
        )}

        {/* Switch Login / Signup */}
        <div className="text-center pt-2 text-xs text-slate-500">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(''); }}
                className="font-bold text-slate-900 hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(''); }}
                className="font-bold text-slate-900 hover:underline"
              >
                Create Account (SQLite DB)
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
