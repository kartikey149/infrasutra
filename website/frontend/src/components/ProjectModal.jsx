import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import { formatNumber } from '../utils/dateFormatter';
import {
  FolderKanban,
  X,
  Plus,
  Edit3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  User,
  MapPin,
  Save,
  ArrowLeft,
  ShieldCheck,
  HardHat,
  Users,
  Briefcase,
  FileText,
  Trash2,
  Ban,
} from 'lucide-react';

export default function ProjectModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const { projects = [], activeProject, switchProject, updateProject, addProject, deleteProject, abandonProject } = useProject();
  const { user, authFetch } = useAuth();

  // All Hooks must remain at top-level before ANY conditional return
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'edit' | 'create'
  const [editingProject, setEditingProject] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);

  // Dynamic Supervisors Directory from SQLite
  const [supervisors, setSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  // Form State with comprehensive project management & supervisory fields
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    budget: '',
    startDate: '',
    endDate: '',
    supervisor: 'Unassigned',
    supervisor_id: null,
    status: 'On Track',
    description: '',
    projectManager: '',
    safetyOfficer: '',
    contractor: '',
    department: '',
    priority: 'High',
    contractType: 'EPC',
    workersOnSite: 0,
    clientName: 'Oil India Limited',
  });

  const loadSupervisors = async () => {
    setLoadingSupervisors(true);
    try {
      const res = await authFetch(`${API_BASE}/users/supervisors`);
      const data = await res.json();
      if (data.success) {
        setSupervisors(data.supervisors || []);
      }
    } catch (err) {
      console.warn('Backend unavailable; loading supervisors in Standalone Mode:', err);
      const registered = JSON.parse(localStorage.getItem('sih_registered_users') || '[]');
      const clientSupervisors = registered
        .filter(u => u.roleKey === 'supervisor')
        .map(u => ({ id: u.id, name: u.name, email: u.email, role: 'supervisor' }));

      const defaultSupervisors = [
        { id: 1, name: 'Ramesh Kumar (Supervisor 1)', email: 'supervisor1@oilindia.in', role: 'supervisor' },
        { id: 2, name: 'Kartik Kesarwani (Supervisor 2)', email: 'supervisor2@oilindia.in', role: 'supervisor' },
        { id: 3, name: 'Sunil Baruah (Supervisor 3 - Unassigned)', email: 'supervisor3@oilindia.in', role: 'supervisor' }
      ];
      setSupervisors([...defaultSupervisors, ...clientSupervisors]);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSupervisors();
    }
  }, [isOpen]);

  // Safe guarded return after all hooks have been declared
  if (!isOpen) return null;

  const handleClose = () => {
    setViewMode('list');
    setEditingProject(null);
    setSaveError(null);
    setSaveSuccess(null);
    onClose();
  };

  const openEditMode = (project) => {
    setEditingProject(project);
    setSaveError(null);
    setSaveSuccess(null);
    // Find matched supervisor in dynamically loaded list
    const matched = supervisors.find(s => s.name === project?.supervisor);
    setFormData({
      name: project?.name || '',
      location: project?.location || '',
      budget: project?.budget || '₹50.0 Cr',
      startDate: project?.startDate || '2026-04-01',
      endDate: project?.endDate || '2026-12-31',
      supervisor: project?.supervisor || 'Unassigned',
      supervisor_id: matched ? matched.id : null,
      status: project?.status || 'On Track',
      description: project?.description || '',
      projectManager: project?.projectManager || '',
      safetyOfficer: project?.safetyOfficer || '',
      contractor: project?.contractor || '',
      department: project?.department || '',
      priority: project?.priority || 'High',
      contractType: project?.contractType || 'EPC (Lump Sum)',
      workersOnSite: project?.workersOnSite || 0,
      clientName: project?.clientName || 'Oil India Limited',
    });
    setViewMode('edit');
  };

  const openCreateMode = () => {
    setEditingProject(null);
    setSaveError(null);
    setSaveSuccess(null);
    setFormData({
      name: '',
      location: '',
      budget: '₹50.0 Cr',
      startDate: '2026-04-01',
      endDate: '2026-12-31',
      supervisor: 'Unassigned',
      supervisor_id: null,
      status: 'On Track',
      description: '',
      projectManager: '',
      safetyOfficer: '',
      contractor: '',
      department: 'Pipeline & Operations',
      priority: 'High',
      contractType: 'EPC (Lump Sum)',
      workersOnSite: 50,
      clientName: 'Oil India Limited',
    });
    setViewMode('create');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setSaveError('Please enter a Project Name.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const payload = {
        ...formData,
        supervisor_id: formData.supervisor_id ? parseInt(formData.supervisor_id, 10) : null,
      };

      if (viewMode === 'edit' && editingProject) {
        await updateProject({
          id: editingProject.id,
          ...payload,
        });
        setSaveSuccess('Project updated and supervisor assigned successfully.');
      } else if (viewMode === 'create') {
        await addProject(payload);
        setSaveSuccess('Project created and assigned successfully.');
      }
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to save project:', err);
      setSaveError(err.message || 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const safeProjects = Array.isArray(projects) ? projects : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-5xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            {viewMode !== 'list' && (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200 transition"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800">
              <FolderKanban size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {viewMode === 'list' && 'Project Portfolio Manager'}
                {viewMode === 'edit' && `Modify Project: ${editingProject?.name || ''}`}
                {viewMode === 'create' && 'Add New Infrastructure Project'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {viewMode === 'list' && 'Select active workspace, assign supervisory personnel, or edit project parameters'}
                {viewMode !== 'list' && 'Configure project metadata, supervision hierarchy, safety leads, and timeline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'list' && (
              <button
                type="button"
                onClick={openCreateMode}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> Add Project
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {safeProjects.map((project) => {
                if (!project) return null;
                const isActive = Boolean(activeProject && project.id === activeProject.id);

                return (
                  <div
                    key={project.id}
                    className={`p-5 rounded-2xl border transition-all duration-200 space-y-3 relative flex flex-col justify-between ${
                      isActive
                        ? 'bg-amber-50/60 border-amber-400 shadow-md ring-1 ring-amber-300'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-slate-500">{project.id}</span>
                            {project.priority && (
                              <PriorityBadge priority={project.priority} />
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm mt-0.5">{project.name}</h3>
                        </div>
                        <StatusBadge status={project.status} />
                      </div>

                      <p className="text-[11px] text-slate-600 mb-3 line-clamp-2">{project.description}</p>

                      {/* Key Project Information Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <DollarSign size={12} className="text-slate-400 shrink-0" />
                          <span className="font-bold">{project.budget}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <HardHat size={12} className="text-amber-500 shrink-0" />
                          <span className="truncate" title={`Supervisor: ${project.supervisor}`}>
                            <strong className="text-slate-500">Sup:</strong> {project.supervisor || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Briefcase size={12} className="text-blue-500 shrink-0" />
                          <span className="truncate" title={`Manager: ${project.projectManager}`}>
                            <strong className="text-slate-500">Mgr:</strong> {project.projectManager || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                          <span className="truncate" title={`HSE: ${project.safetyOfficer}`}>
                            <strong className="text-slate-500">HSE:</strong> {project.safetyOfficer || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Users size={12} className="text-slate-400 shrink-0" />
                          <span>{formatNumber(project.workersOnSite || 0, i18n.language)} {t('dashboard.workers', 'Workers on Site')}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-semibold">{t('dashboard.executionProgress', 'Execution Progress')}</span>
                          <span className="font-bold text-slate-900">{formatNumber(project.progress || 0, i18n.language)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-slate-900 h-full rounded-full transition-all duration-300"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-3">
                      <button
                        type="button"
                        onClick={() => openEditMode(project)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold transition flex items-center gap-1.5"
                      >
                        <Edit3 size={13} /> Modify Details
                      </button>

                      {isActive ? (
                        <span className="px-3 py-1 rounded-xl bg-amber-200 text-amber-900 font-extrabold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Active Workspace
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            switchProject(project.id);
                            handleClose();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-sm"
                        >
                          Switch to Project
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* EDIT / CREATE FORM VIEW (ORGANIZED INTO DISTINCT SECTIONS) */}
          {viewMode !== 'list' && (
            <form onSubmit={handleSave} className="space-y-5 text-xs">
              
              {/* SECTION 1: GENERAL PROJECT INFORMATION */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Building2 size={15} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900 text-xs tracking-wide uppercase">
                    1. General Information & Client Owner
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      placeholder="e.g. Sector 4 Crude Oil Pipeline Expansion"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Client / Owner Organisation</label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      placeholder="e.g. Oil India Limited"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department / Division</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      placeholder="e.g. Pipeline & Process Engineering"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Location Site *</label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      placeholder="e.g. Dibrugarh Sector 4, Assam"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Budget Allocation *</label>
                    <input
                      type="text"
                      required
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      placeholder="e.g. ₹45.2 Cr"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: SUPERVISORY & MANAGEMENT TEAM ("Who will supervise this") */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Users size={15} className="text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-xs tracking-wide uppercase">
                    2. Supervisory & Leadership Team (Role Assignments)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1">
                        <HardHat size={13} className="text-amber-500" /> Assigned Field Supervisor
                      </span>
                    </label>
                    {loadingSupervisors ? (
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-500 flex items-center gap-2">
                        <Clock size={13} className="animate-spin text-amber-500" /> Loading supervisors...
                      </div>
                    ) : supervisors.length === 0 ? (
                      <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 text-xs text-amber-800 font-medium">
                        No supervisors are currently available.
                      </div>
                    ) : (
                      <select
                        value={formData.supervisor_id || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const selectedSup = supervisors.find(s => String(s.id) === String(val));
                          setFormData({
                            ...formData,
                            supervisor_id: val ? parseInt(val, 10) : null,
                            supervisor: selectedSup ? selectedSup.name : 'Unassigned'
                          });
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                      >
                        <option value="">Supervisor: Unassigned</option>
                        {supervisors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email || 'No email'})
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Select an active supervisor from database to grant project access & email alerts.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1">
                        <Briefcase size={13} className="text-blue-500" /> Project Manager / In-Charge
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.projectManager}
                      onChange={(e) => setFormData({ ...formData, projectManager: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      placeholder="e.g. Arvind Sharma (DGM Projects)"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Responsible for Primavera schedule approval & WBS.</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1">
                        <ShieldCheck size={13} className="text-emerald-500" /> HSE / Safety Officer
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.safetyOfficer}
                      onChange={(e) => setFormData({ ...formData, safetyOfficer: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      placeholder="e.g. Sunil Baruah (HSE Lead)"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Ensures compliance, permits, and hazard mitigation.</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1">
                        <Building2 size={13} className="text-purple-500" /> Primary Contractor / EPC Vendor
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.contractor}
                      onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      placeholder="e.g. Punj Lloyd Energy Ltd. / L&T"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Contracted engineering & construction agency.</p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: TIMELINE, CONTRACT & SITE OPERATIONS */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Calendar size={15} className="text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-xs tracking-wide uppercase">
                    3. Timeline, Contract & Operations
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Baseline Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Baseline Completion Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Current Schedule Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    >
                      <option value="On Track">On Track</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Critical Delay">Critical Delay</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Priority Level</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    >
                      <option value="Critical">Critical (High Executive Visibility)</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low / Routine</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contract Structure</label>
                    <select
                      value={formData.contractType}
                      onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    >
                      <option value="EPC (Lump Sum)">EPC (Lump Sum Turnkey)</option>
                      <option value="EPC (Cost Plus)">EPC (Cost Plus Fixed Fee)</option>
                      <option value="Item Rate">Item Rate / Schedule of Rates</option>
                      <option value="PMC / EPCM">PMC / EPCM Consulting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Total Workers On Site</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.workersOnSite}
                      onChange={(e) => setFormData({ ...formData, workersOnSite: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      placeholder="e.g. 150"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: TECHNICAL SCOPE & NOTES */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <FileText size={15} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900 text-xs tracking-wide uppercase">
                    4. Technical Scope & Execution Constraints
                  </h3>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe scope, WBS milestones, soil/weather conditions, and environmental clearance notes..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-900 resize-none"
                  />
                </div>
              </div>

              {/* Validation & Feedback Banners */}
              {saveError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center gap-2.5 shadow-sm">
                  <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                  <span>{saveError}</span>
                </div>
              )}
              {saveSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2.5 shadow-sm">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {/* Danger Zone: Shutdown & Delete for Planners */}
              {viewMode === 'edit' && editingProject && ['planner', 'manager', 'admin'].includes(String(user?.role || '').toLowerCase()) && (
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-rose-600" /> Site Planner Lifecycle Control
                      </h4>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        If this project is closed or suspended due to shutdown conditions, you can abandon or permanently delete it.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {editingProject.status !== 'Shut Down' && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to abandon/shut down project "${editingProject.name}"?`)) {
                              setIsSaving(true);
                              try {
                                await abandonProject(editingProject.id);
                                setSaveSuccess(`Project "${editingProject.name}" marked as Shut Down.`);
                                setTimeout(() => handleClose(), 1000);
                              } catch (err) {
                                setSaveError(err.message || 'Failed to abandon project');
                              } finally {
                                setIsSaving(false);
                              }
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold flex items-center gap-1.5 transition text-[11px]"
                        >
                          <Ban size={13} /> Abandon / Shut Down
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`⚠️ DANGER: Permanently delete project "${editingProject.name}" and all its schedule activities & logs? This action cannot be undone.`)) {
                            setIsSaving(true);
                            try {
                              await deleteProject(editingProject.id);
                              setSaveSuccess(`Project "${editingProject.name}" deleted successfully.`);
                              setTimeout(() => handleClose(), 1000);
                            } catch (err) {
                              setSaveError(err.message || 'Failed to delete project');
                            } finally {
                              setIsSaving(false);
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 transition text-[11px] shadow-sm"
                      >
                        <Trash2 size={13} /> Delete Project
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Save size={14} className={isSaving ? "animate-spin" : ""} />
                  {isSaving ? 'Saving...' : 'Save Project Details'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  switch (status) {
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    case 'Shut Down':
    case 'Abandoned':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <Ban size={12} /> Shut Down / Abandoned
        </span>
      );
    case 'Delayed':
    case 'Critical Delay':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle size={12} /> {status || 'Delayed'}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
          <Clock size={12} /> {status || 'On Track'}
        </span>
      );
  }
}

function PriorityBadge({ priority }) {
  if (priority === 'Critical') {
    return (
      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
        Critical
      </span>
    );
  }
  if (priority === 'High') {
    return (
      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
        High
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-md text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
      {priority}
    </span>
  );
}
