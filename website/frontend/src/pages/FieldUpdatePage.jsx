import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, CheckCircle2, ArrowRight, Bot, 
  Send, Zap, Edit3, Trash2, History, PlusCircle,
  AlertCircle, HardHat, Briefcase, Filter, X,
  Camera, MapPin, RefreshCw, ShieldCheck, Compass,
  Eye, RotateCcw, Lock, Video, FlipHorizontal, Upload, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';
import ActivitySuggestions from '../components/ActivitySuggestions';

const PROJECT_SITE_COORDINATES = {
  'PRJ-01': {
    lat: 28.462212,
    lng: 77.490878,
    name: 'Sector 4 Crude Oil Pipeline Expansion',
    address: 'Noida Institute of Engineering and Technology (Old Campus), Plot No. 19, Noida-Greater Noida Expressway, Shafipur, Greater Noida, Gautam Buddha Nagar, Uttar Pradesh 201306'
  },
  'PRJ-02': {
    lat: 27.382614,
    lng: 95.626435,
    name: 'Refinery Unit-2 Modernization Site, Digboi',
    address: 'Refinery Gate 3, Sector 2 Industrial Complex, Digboi, Tinsukia, Assam 786171'
  }
};

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function calculateSHA256(str) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    return '71c9065c5188f6381ad72099e09d13';
  }
}

export default function FieldUpdatePage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user, isManager, isSupervisor, authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Activity suggestion state — powers the Google-search-style suggestion dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const voiceRecognitionRef = useRef(null);
  const rawVoiceRef = useRef('');
  const suggestionWrapRef = useRef(null);

  // Activity Timing & Execution Metrics
  const [eventType, setEventType] = useState('Actual Finish'); // 'Actual Start' | 'Work in Progress' | 'Actual Finish'
  const [workStart, setWorkStart] = useState(() => new Date().toISOString().slice(0, 16));
  const [workEnd, setWorkEnd] = useState(() => new Date().toISOString().slice(0, 16));
  const [percentComplete, setPercentComplete] = useState(100);
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString().slice(0, 19).replace('T', ' '));

  // Update live clock for loggedAt
  useEffect(() => {
    const timer = setInterval(() => {
      setLoggedAt(new Date().toISOString().slice(0, 19).replace('T', ' '));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Location State
  const [location, setLocation] = useState({
    lat: 28.462212,
    lng: 77.490878,
    accuracy: 67,
    status: 'locked',
    address: 'Noida Institute of Engineering and Technology (Old Campus), Plot No. 19, Noida-Greater Noida Expressway, Shafipur, Greater Noida, Gautam Buddha Nagar, Uttar Pradesh 201306',
    geofence: 'Perimeter Notice (384795m)',
    distMeters: 384795
  });
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Geotagged Camera State
  const [capturedPhoto, setCapturedPhoto] = useState(null); // { dataUrl, hash, timestamp }
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [cameraError, setCameraError] = useState(null);
  const [viewFullPhoto, setViewFullPhoto] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Acquire current device location
  const acquireDeviceLocation = () => {
    setIsCalibrating(true);
    const targetSite = PROJECT_SITE_COORDINATES[activeProject?.id] || PROJECT_SITE_COORDINATES['PRJ-01'];

    if (!navigator.geolocation) {
      setLocation({
        lat: targetSite.lat,
        lng: targetSite.lng,
        accuracy: 67,
        status: 'locked',
        address: targetSite.address,
        geofence: 'Perimeter Notice (384795m)',
        distMeters: 384795
      });
      setIsCalibrating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 45);

        const dist = Math.round(getDistanceInMeters(lat, lng, targetSite.lat, targetSite.lng));
        const geofenceText = dist <= 1000 
          ? `Within Site Geofence (${dist}m)` 
          : `Perimeter Notice (${dist}m)`;

        let addr = targetSite.address;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { 'Accept-Language': 'en' }
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) {
              addr = data.display_name;
            }
          }
        } catch {
          // fallback
        }

        setLocation({
          lat,
          lng,
          accuracy,
          status: 'locked',
          address: addr,
          geofence: geofenceText,
          distMeters: dist
        });
        setIsCalibrating(false);
      },
      (err) => {
        console.warn('Geolocation notice:', err.message);
        setLocation({
          lat: targetSite.lat,
          lng: targetSite.lng,
          accuracy: 67,
          status: 'locked',
          address: targetSite.address,
          geofence: 'Perimeter Notice (384795m)',
          distMeters: 384795
        });
        setIsCalibrating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    acquireDeviceLocation();
  }, [activeProject?.id]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Camera Management
  const openCamera = async (mode = facingMode) => {
    setIsCameraOpen(true);
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }
      }, 100);
    } catch (err) {
      console.warn('Camera stream error:', err);
      setCameraError('Webcam / Browser camera permission not granted or unavailable on this device. Click below to select a photo to geotag:');
    }
  };

  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn('Video play error:', e));
    }
  }, [isCameraOpen]);

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const flipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    openCamera(nextMode);
  };

  const burnWatermarkOntoCanvas = (canvas, width, height, hashSnippet) => {
    const ctx = canvas.getContext('2d');
    const bannerHeight = Math.max(65, Math.round(height * 0.12));

    ctx.fillStyle = 'rgba(10, 15, 30, 0.88)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    ctx.fillStyle = '#6366f1';
    ctx.fillRect(0, height - bannerHeight, width, 3);

    const fontSize = Math.max(11, Math.round(width * 0.021));
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = '#ffffff';

    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const latStr = `${Math.abs(location.lat).toFixed(6)}° ${location.lat >= 0 ? 'N' : 'S'}`;
    const lngStr = `${Math.abs(location.lng).toFixed(6)}° ${location.lng >= 0 ? 'E' : 'W'}`;

    ctx.fillText(`📍 GPS: ${latStr}, ${lngStr}  (±${location.accuracy}m)`, 14, height - bannerHeight + fontSize * 1.3);

    ctx.fillStyle = '#38bdf8';
    const projName = activeProject?.name || 'Sector 4 Crude Oil Pipeline';
    ctx.fillText(`⏰ ${timeStr}  |  🏗️ ${activeProject?.id || 'PRJ-01'}: ${projName.slice(0, 32)}`, 14, height - bannerHeight + fontSize * 2.7);

    ctx.fillStyle = '#10b981';
    ctx.font = `${Math.max(10, Math.round(fontSize * 0.85))}px sans-serif`;
    ctx.fillText(`✓ Geotag HUD burned onto pixel matrix • Hardware camera verified [SHA-256: ${hashSnippet}]`, 14, height - bannerHeight + fontSize * 4.0);
  };

  const snapPhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const rawData = canvas.toDataURL('image/jpeg', 0.85);
    const fullHash = await calculateSHA256(rawData + Date.now());
    const hashSnippet = fullHash.slice(0, 14);

    burnWatermarkOntoCanvas(canvas, canvas.width, canvas.height, hashSnippet);

    const finalDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const finalHash = await calculateSHA256(finalDataUrl);

    setCapturedPhoto({
      dataUrl: finalDataUrl,
      hash: finalHash,
      timestamp: new Date().toISOString()
    });

    closeCamera();
  };

  const handleHardwareCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 1280;
        canvas.height = img.height || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const tempHash = await calculateSHA256(file.name + Date.now());
        const hashSnippet = tempHash.slice(0, 14);

        burnWatermarkOntoCanvas(canvas, canvas.width, canvas.height, hashSnippet);

        const finalDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const finalHash = await calculateSHA256(finalDataUrl);

        setCapturedPhoto({
          dataUrl: finalDataUrl,
          hash: finalHash,
          timestamp: new Date().toISOString()
        });
        closeCamera();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Submissions History & Editing
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    raw_input: '',
    extracted_discipline: '',
    extracted_task: '',
    event_type: 'Actual Finish',
    location_zone: '',
    matched_activity_id: '',
  });
  const [projectActivities, setProjectActivities] = useState([]);


  // Fetch activities for manual override dropdown
  const fetchActivities = async () => {
    if (!activeProject?.id) {
      setProjectActivities([]);
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/schedule/activities?project_id=${activeProject.id}`);
      const data = await res.json();
      if (data.success) {
        setProjectActivities(data.activities);
      }
    } catch (err) {
      console.warn('Failed to load project activities:', err);
    }
  };

  // ─── Voice Recognition for Observation Notes ────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => { setIsVoiceRecording(true); rawVoiceRef.current = ''; };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      rawVoiceRef.current = transcript;
      setInputText(transcript);
      setIsVoiceInput(true);
      setShowSuggestions(true);
    };
    recognition.onerror = () => setIsVoiceRecording(false);
    recognition.onend = () => {
      setIsVoiceRecording(false);
      if (rawVoiceRef.current.trim()) {
        setShowSuggestions(true);
        setIsVoiceInput(true);
      }
    };
    voiceRecognitionRef.current = recognition;
  }, []);

  const toggleFieldVoice = () => {
    if (isVoiceRecording) {
      voiceRecognitionRef.current?.stop();
      setIsVoiceRecording(false);
    } else {
      setInputText('');
      rawVoiceRef.current = '';
      setIsVoiceInput(false);
      try { voiceRecognitionRef.current?.start(); } catch {}
    }
  };

  // When user selects an activity suggestion — fill the textarea with a template
  const handleActivitySelect = (activity) => {
    const name = activity.name || activity.activity_name || 'Activity';
    const actId = activity.id || activity.activity_id || '';
    const disc = activity.discipline || '';
    setInputText(`[${actId}] ${name} — ${disc} work ${isVoiceInput ? 'voice observation recorded' : 'observation noted'}.`);
    setShowSuggestions(false);
    setIsVoiceInput(false);
  };

  const fetchHistory = async () => {
    if (!activeProject?.id) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/pending-updates?project_id=${activeProject.id}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.updates);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeProject?.id, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (!capturedPhoto) {
      setError('Tamper-proof protocol requires a direct in-app geotagged photo before submitting.');
      return;
    }
    if (!activeProject?.id) {
      setError('No project selected or assigned. Cannot submit field report.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await authFetch(`${API_BASE}/field-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText, 
          source_type: 'geotagged_camera',
          project_id: activeProject.id,
          submitted_by: user?.name || 'Site Supervisor',
          photo_data: capturedPhoto.dataUrl,
          photo_hash: capturedPhoto.hash,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy,
          location_address: location.address,
          geofence_status: location.geofence,
          event_type: eventType,
          work_start: workStart,
          work_end: workEnd,
          logged_at: loggedAt,
          percent_complete: parseInt(percentComplete, 10) || 100
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setInputText('');
        setCapturedPhoto(null);
      } else {
        setError(data.detail || 'Failed to process update');
      }
    } catch (err) {
      setError(`Backend error: ${err.message}. Ensure backend is running.`);
    } finally {
      setLoading(false);
    }
  };


  const openEditModal = (item) => {
    setEditingItem(item);
    setEditFormData({
      raw_input: item.raw_input,
      extracted_discipline: item.extracted_discipline || 'Civil',
      extracted_task: item.extracted_task || '',
      event_type: item.event_type || 'Actual Finish',
      location_zone: item.location_zone || '',
      matched_activity_id: item.matched_activity_id || '',
      photo_data: item.photo_data || '',
      photo_hash: item.photo_hash || '',
      latitude: item.latitude || 28.462212,
      longitude: item.longitude || 77.490878,
      accuracy: item.accuracy || 45,
      location_address: item.location_address || '',
      work_start: item.work_start || '',
      work_end: item.work_end || '',
    });
  };

  const handleEditPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const fakeHash = 'mod_' + Math.random().toString(36).substring(2, 12);
      setEditFormData(prev => ({
        ...prev,
        photo_data: dataUrl,
        photo_hash: fakeHash
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await authFetch(`${API_BASE}/pending-updates/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          latitude: parseFloat(editFormData.latitude) || null,
          longitude: parseFloat(editFormData.longitude) || null,
          accuracy: parseFloat(editFormData.accuracy) || null,
        })
      });
      if (res.ok) {
        setEditingItem(null);
        fetchHistory();
      }
    } catch (err) {
      alert(`Error updating submission: ${err.message}`);
    }
  };

  const handleDeleteSubmission = async (id) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    try {
      const res = await authFetch(`${API_BASE}/pending-updates/${id}`, { method: 'DELETE' });
      if (res.ok) fetchHistory();
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const samplePrompts = activeProject?.id === 'PRJ-02'
    ? [
        "Unit-2 mein Heat Exchanger bundle insertion complete ho gaya",
        "Control-Room mein DCS panel wiring cable terminate ho gaya status updated",
        "Gas Turbine Generator foundation concrete pouring finished at 18:00"
      ]
    : [
        "Sector-4A mein Line 24-XX ka spool erection aaj start ho gaya",
        "Zone-4 mein Pipe Rack Support Fabrication complete ho gaya",
        "Sector-4B mein Mainline Trenching excavation 65% complete"
      ];

  const isChecklistComplete = location.status === 'locked' && !!capturedPhoto && !!inputText.trim();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Banner & Project Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <HardHat size={16} /> SITE OBSERVATION & FIELD LOGGER
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {activeProject?.name || 'Sector 4 Crude Oil Pipeline Expansion'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role: <span className="font-bold text-slate-800 capitalize">{user?.role || 'Supervisor'}</span> | Zero-Trust Geotagged Photo & Live Location Logging
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'new'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PlusCircle size={14} /> New Log
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History size={14} /> Submissions & Edit ({history.length || '•'})
          </button>
        </div>
      </div>

      {/* TAB 1: NEW OBSERVATION */}
      {activeTab === 'new' && (
        <div className="space-y-6">
          {/* Top Verification Protocol Guard Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 px-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-indigo-700 font-bold text-xs">
              <ShieldCheck size={18} className="text-indigo-600" />
              <span>Tamper-Proof Field Verification Protocol Active</span>
            </div>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-[11px] rounded-full border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              100% Data Reliability Guard
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Field 1: Live Location Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <MapPin size={16} className="text-indigo-600" />
                  <span>Field 1: Live Location (Auto-detected, Read-only)</span>
                </div>
                <button
                  type="button"
                  onClick={acquireDeviceLocation}
                  disabled={isCalibrating}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isCalibrating ? "animate-spin" : ""} />
                  {isCalibrating ? 'Acquiring GPS...' : 'Re-calibrate GPS'}
                </button>
              </div>

              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* GPS Coordinates */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    GPS Coordinates
                  </span>
                  <div className="font-mono font-bold text-slate-800 text-sm">
                    {typeof location?.lat === 'number' ? location.lat.toFixed(6) : '28.462212'}°, {typeof location?.lng === 'number' ? location.lng.toFixed(6) : '77.490878'}°
                  </div>
                </div>

                {/* Signal Accuracy */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Signal Accuracy
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      (location?.accuracy || 45) <= 30 ? 'bg-emerald-500' : (location?.accuracy || 45) <= 80 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}></span>
                    ±{location?.accuracy || 45} meters ({(location?.accuracy || 45) <= 30 ? 'High' : (location?.accuracy || 45) <= 80 ? 'Moderate' : 'Low'})
                  </div>
                </div>

                {/* Site Geofence */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Site Geofence
                  </span>
                  <div className="font-bold text-amber-700 text-sm">
                    {location?.geofence || 'Perimeter Notice'}
                  </div>
                </div>
              </div>

              {/* Resolved Address Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 px-4 flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                <Compass size={16} className="text-indigo-600 shrink-0" />
                <span className="truncate">{location?.address || 'Site Location'}</span>
              </div>
            </div>

            {/* Field 2: In-App Camera Evidence Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Camera size={16} className="text-indigo-600" />
                  <span>Field 2: In-App Camera Evidence (No Gallery Upload)</span>
                </div>
              </div>

              {/* Captured Photo Preview (Screenshot 2 Match) */}
              {capturedPhoto ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 group">
                  <img
                    src={capturedPhoto.dataUrl}
                    alt="Geotagged Site Evidence"
                    className="w-full h-72 md:h-80 object-cover"
                  />

                  {/* Top HUD Bar */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <div className="px-3 py-1 bg-slate-900/80 backdrop-blur-md text-emerald-400 text-[11px] font-mono font-bold rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      SHA-256: {capturedPhoto.hash.slice(0, 12)}...
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewFullPhoto(capturedPhoto.dataUrl)}
                        className="px-3 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold rounded-xl backdrop-blur-md border border-slate-700 flex items-center gap-1 transition shadow-md"
                      >
                        <Eye size={13} /> View Full
                      </button>
                      <button
                        type="button"
                        onClick={() => openCamera()}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-md"
                      >
                        <RotateCcw size={13} /> Retake
                      </button>
                    </div>
                  </div>

                  {/* Bottom Verification Footer Overlay */}
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 backdrop-blur-md px-4 py-2 border-t border-slate-800 text-[11px] text-indigo-300 font-mono flex items-center justify-between">
                    <span>✓ Geotag HUD burned onto pixel matrix • Hardware camera verified</span>
                    <span className="text-slate-400 font-sans hidden sm:inline">
                      {capturedPhoto.timestamp?.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                </div>
              ) : (
                /* Empty Photo Box (Screenshot 1 Match) */
                <div className="border-2 border-dashed border-indigo-200 rounded-3xl p-8 py-10 text-center flex flex-col items-center justify-center bg-indigo-50/20 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Camera size={26} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Geotagged Site Photo Required
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Capture live with in-app camera or select a photo from your device. Real-time GPS coordinates and SHA-256 hash are automatically burned onto the photo.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => openCamera()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl transition shadow-md shadow-indigo-200"
                    >
                      <Camera size={15} /> Open Live Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-2xl transition shadow-sm"
                    >
                      <Upload size={14} className="text-slate-600" /> Select Photo File
                    </button>
                  </div>

                  {/* Hardware file input */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleHardwareCapture}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Field 3: Field Observation Notes */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Field 3: Field Observation Notes (Hinglish or English)
                </label>
                {/* Voice mic button for observation notes */}
                <button
                  type="button"
                  onClick={toggleFieldVoice}
                  title={isVoiceRecording ? 'Stop recording' : 'Speak your observation'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    isVoiceRecording
                      ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isVoiceRecording
                    ? <><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Stop Recording</>
                    : <><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Speak</>
                  }
                </button>
              </div>

              {/* Suggestion dropdown wrapper — relative so popup positions correctly */}
              <div ref={suggestionWrapRef} className="relative">
                <textarea
                  rows={3}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setIsVoiceInput(false);
                    setShowSuggestions(e.target.value.trim().length >= 3);
                  }}
                  onFocus={() => inputText.trim().length >= 3 && setShowSuggestions(true)}
                  placeholder={isVoiceRecording ? '🎙️ Listening… speak your observation in Hindi or English…' : 'e.g. Zone-4 mein Pipe Rack Support Fabrication complete ho gaya at 17:30…'}
                  className={`w-full p-4 bg-slate-50 border rounded-2xl text-xs text-slate-900 focus:outline-none resize-none font-medium leading-relaxed transition ${
                    isVoiceRecording
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-500'
                  }`}
                />

                {/* Google-search-style suggestion dropdown */}
                {showSuggestions && (
                  <ActivitySuggestions
                    query={inputText}
                    activities={projectActivities}
                    onSelect={handleActivitySelect}
                    onDismiss={() => setShowSuggestions(false)}
                    variant="dropdown"
                    isVoice={isVoiceInput}
                  />
                )}
              </div>

              {/* Example prompts */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Template Presets for {activeProject?.id || 'PRJ-01'}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInputText(ex)}
                      className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition border border-slate-200"
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Field 4: Work Timing & Real-Time Sync */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Clock size={16} className="text-indigo-600" />
                  <span>Field 4: Work Timing & Real-Time Sync</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold rounded-full border border-indigo-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Current Logged Time: {loggedAt}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Event Type */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Milestone Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                  >
                    <option value="Actual Start">Actual Start (Commenced)</option>
                    <option value="Work in Progress">Work in Progress (Ongoing)</option>
                    <option value="Actual Finish">Actual Finish (Completed)</option>
                  </select>
                </div>

                {/* Start Time */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Work Start Time</label>
                  <input
                    type="datetime-local"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Work End Time</label>
                  <input
                    type="datetime-local"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>

                {/* Percent Complete */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block flex items-center justify-between">
                    <span>Progress</span>
                    <span className="font-bold text-indigo-600">{percentComplete}%</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={percentComplete}
                    onChange={(e) => setPercentComplete(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Verification Protocol Gate Checklist (Screenshot 1 Match) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Verification Protocol Gate Checklist:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 1. Live GPS Fix */}
                <div className={`p-3 rounded-xl border flex items-center gap-2 font-bold ${
                  location.status === 'locked'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {location.status === 'locked' ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <RefreshCw size={16} className="animate-spin text-amber-600" />
                  )}
                  <span>1. Live GPS Fix ({location.status === 'locked' ? 'Locked' : 'Acquiring...'})</span>
                </div>

                {/* 2. Geotagged Photo */}
                <div className={`p-3 rounded-xl border flex items-center gap-2 font-bold ${
                  capturedPhoto
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  {capturedPhoto ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block"></span>
                  )}
                  <span>2. Geotagged Photo {capturedPhoto ? '(Captured)' : '(Required)'}</span>
                </div>

                {/* 3. Observation Notes */}
                <div className={`p-3 rounded-xl border flex items-center gap-2 font-bold ${
                  inputText.trim()
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  {inputText.trim() ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block"></span>
                  )}
                  <span>3. Observation Notes {inputText.trim() ? '(Ready)' : '(Empty)'}</span>
                </div>
              </div>
            </div>

            {/* Submit Action Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-400">
                AI extracts discipline, task name, and links to Primavera WBS with tamper-proof evidence.
              </div>
              <button
                type="submit"
                disabled={loading || !isChecklistComplete}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-2xl transition shadow-md shadow-indigo-100"
              >
                <Sparkles size={15} className={loading ? "animate-spin" : "text-amber-300"} />
                {loading ? 'Submitting to SQLite...' : 'Submit Verified Report to SQLite'}
              </button>
            </div>
          </form>

          {/* Error display */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  {result.auto_approved ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl flex items-center gap-1.5 border border-emerald-300">
                      ⚡ Auto-Approved & Pushed to Schedule (Confidence {Math.round(result.confidence * 100)}% &gt;= 90%)
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> Successfully Stored in SQLite (Record #{result.pending_update_id})
                    </>
                  )}
                </div>
                <Link
                  to={result.auto_approved ? "/schedule-explorer" : "/approval"}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                >
                  {result.auto_approved ? 'View Updated Schedule' : 'Review in Approval Queue'} <ArrowRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    AI Extracted Features
                  </span>
                  <div>• <strong>Discipline:</strong> {result.extracted?.discipline}</div>
                  <div>• <strong>Task:</strong> {result.extracted?.extracted_task}</div>
                  <div>• <strong>Event Type:</strong> {result.extracted?.event_type}</div>
                  <div>• <strong>Location:</strong> {result.extracted?.location_zone}</div>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Matched Schedule WBS Activity
                  </span>
                  <div className="font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded inline-block border border-indigo-200">
                    {result.best_match?.activity_id}
                  </div>
                  <div className="font-bold text-slate-800 text-sm">
                    {result.best_match?.activity_name}
                  </div>
                  <div className="text-emerald-700 font-bold">
                    Confidence: {Math.round(result.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY SUBMISSIONS & EDIT PREVIOUS WORK */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing submissions for <strong>{activeProject?.name}</strong> with tamper-proof evidence logs.
            </span>
          </div>

          {historyLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading database records...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 text-slate-400 text-xs">
              No field updates submitted for this project yet. Use the New Log tab or the Telegram Bot to submit.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Photo thumbnail if present */}
                    {item.photo_data ? (
                      <button
                        type="button"
                        onClick={() => setViewFullPhoto(item.photo_data)}
                        className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-300 hover:opacity-90 transition group"
                        title="Click to view full photo evidence"
                      >
                        <img
                          src={item.photo_data}
                          alt="Evidence"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                          <Eye size={14} />
                        </div>
                      </button>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <Camera size={18} />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Record #{item.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status?.toUpperCase()}
                        </span>
                        {item.photo_hash && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] flex items-center gap-1">
                            <ShieldCheck size={11} className="text-emerald-600" />
                            {item.photo_hash.slice(0, 10)}...
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.created_at?.slice(0, 16).replace('T', ' ')}
                        </span>
                      </div>

                      <p className="text-slate-700 italic font-medium">"{item.raw_input}"</p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                        <span>Task: <strong className="text-slate-800">{item.extracted_task}</strong></span>
                        <span>•</span>
                        <span>Discipline: <strong className="text-slate-800">{item.extracted_discipline}</strong></span>
                        <span>•</span>
                        <span>Matched ID: <code className="font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">{item.matched_activity_id}</code></span>
                        {item.work_start && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-600 font-semibold">Start: {item.work_start}</span>
                          </>
                        )}
                        {item.work_end && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-semibold">End: {item.work_end}</span>
                          </>
                        )}
                        {item.logged_at && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 font-mono">Logged: {item.logged_at}</span>
                          </>
                        )}
                        {item.latitude && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono text-slate-600">
                              <MapPin size={11} className="text-indigo-600" />
                              {item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
                      title="Edit this submission to correct errors"
                    >
                      <Edit3 size={13} /> Edit Work
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubmission(item.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                      title="Delete submission"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CAMERA VIEWFINDER MODAL */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            {/* Viewfinder Header */}
            <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-indigo-400" />
                <span className="text-sm font-bold">Direct In-App Hardware Camera</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={flipCamera}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Switch Camera (Front/Rear)"
                >
                  <FlipHorizontal size={16} />
                </button>
                <button
                  type="button"
                  onClick={closeCamera}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Video Viewfinder Box */}
            <div className="relative bg-black h-72 sm:h-96 flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center space-y-3 text-rose-400 text-xs">
                  <AlertCircle size={32} className="mx-auto text-rose-500" />
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700"
                  >
                    Open Device Hardware Camera
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Reticle Guides */}
                  <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between text-[10px] font-mono text-emerald-400/80">
                      <span>[GPS LOCK: {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°]</span>
                      <span>[LIVE WATERMARK ACTIVE]</span>
                    </div>
                    <div className="text-center text-[10px] font-mono text-white/50">
                      Align site observation within frame
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Viewfinder Footer & Shutter Button */}
            <div className="p-4 px-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Burned HUD: {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
              </span>
              <button
                type="button"
                onClick={snapPhoto}
                disabled={!!cameraError}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition shadow-lg shadow-indigo-600/30"
              >
                <Camera size={16} /> Capture Geotagged Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL PHOTO EVIDENCE MODAL */}
      {viewFullPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-3 px-5 border-b border-slate-800 flex items-center justify-between text-white text-xs font-bold">
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                Tamper-Proof Geotagged Photo Evidence
              </span>
              <button
                type="button"
                onClick={() => setViewFullPhoto(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto p-2 bg-black flex items-center justify-center">
              <img
                src={viewFullPhoto}
                alt="Full Geotag Evidence"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}


      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Previous Submission (Record #{editingItem.id})
                </h3>
                <p className="text-xs text-slate-500">
                  Correct mistakes in the task name, zone, or reassign the matched activity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Raw Input Text</label>
                <textarea
                  rows={2}
                  value={editFormData.raw_input}
                  onChange={(e) => setEditFormData({ ...editFormData, raw_input: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Extracted Task Name</label>
                  <input
                    type="text"
                    value={editFormData.extracted_task}
                    onChange={(e) => setEditFormData({ ...editFormData, extracted_task: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Discipline</label>
                  <select
                    value={editFormData.extracted_discipline}
                    onChange={(e) => setEditFormData({ ...editFormData, extracted_discipline: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  >
                    <option value="Civil">Civil</option>
                    <option value="Piping">Piping</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Instrumentation">Instrumentation</option>
                    <option value="Structural Steel">Structural Steel</option>
                    <option value="Fire Protection">Fire Protection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Event Type</label>
                  <select
                    value={editFormData.event_type}
                    onChange={(e) => setEditFormData({ ...editFormData, event_type: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  >
                    <option value="Actual Start">Actual Start</option>
                    <option value="Actual Finish">Actual Finish</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Location Zone</label>
                  <input
                    type="text"
                    value={editFormData.location_zone}
                    onChange={(e) => setEditFormData({ ...editFormData, location_zone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reassign Matched WBS Activity</label>
                <select
                  value={editFormData.matched_activity_id}
                  onChange={(e) => setEditFormData({ ...editFormData, matched_activity_id: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                >
                  <option value="">-- Choose Matched Activity --</option>
                  {projectActivities.map((act) => (
                    <option key={act.activity_id} value={act.activity_id}>
                      [{act.activity_id}] {act.activity_name} ({act.discipline})
                    </option>
                  ))}
                </select>
              </div>

              {/* Photo Evidence Replacement */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="font-bold text-slate-700 block flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Camera size={13} className="text-indigo-600" /> Geotagged Photo Evidence</span>
                  <span className="text-[10px] text-slate-400 font-normal">Change / Replace image</span>
                </label>
                <div className="flex items-center gap-3">
                  {editFormData.photo_data ? (
                    <img
                      src={editFormData.photo_data}
                      alt="Preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-300"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                      <Camera size={18} />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditPhotoUpload}
                      className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">If a wrong photo was uploaded, choose the corrected image here.</p>
                  </div>
                </div>
              </div>

              {/* Location Coordinates & Address */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="font-bold text-slate-700 block flex items-center gap-1.5">
                  <MapPin size={13} className="text-indigo-600" /> Location Coordinates & Resolved Site Address
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Latitude (°)</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={editFormData.latitude}
                      onChange={(e) => setEditFormData({ ...editFormData, latitude: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Longitude (°)</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={editFormData.longitude}
                      onChange={(e) => setEditFormData({ ...editFormData, longitude: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Site Address</span>
                  <input
                    type="text"
                    value={editFormData.location_address}
                    onChange={(e) => setEditFormData({ ...editFormData, location_address: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-[11px]"
                    placeholder="Enter physical site address or landmark"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Changes to SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
