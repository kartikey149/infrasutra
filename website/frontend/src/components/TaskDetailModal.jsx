import React from 'react';
import { X, MapPin, Camera } from 'lucide-react';

export default function TaskDetailModal({ task, onClose }) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl max-w-xl w-full p-6 space-y-5 text-slate-900 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {task.wbs}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
              task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              task.status === 'Delayed' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-200 text-slate-800 border border-slate-300'
            }`}>
              {task.status}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1.5">{task.name}</h3>
        </div>

        {/* Progress Grid */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-500 text-[10px]">Planned Progress</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">{task.plannedProgress}%</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-500 text-[10px]">Actual Executed</span>
            <p className="text-base font-bold text-emerald-700 mt-0.5">{task.actualProgress}%</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-500 text-[10px]">Schedule Variance</span>
            <p className={`text-base font-bold mt-0.5 ${task.varianceDays < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {task.varianceDays} Days
            </p>
          </div>
        </div>

        {/* Field Audit Logs */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Camera size={14} className="text-slate-700" /> Geotagged Field Audit Proofs
          </h4>

          {task.lastReport ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Last Verified Log:</span>
                <span className="text-slate-800 font-mono">{new Date(task.lastReport.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-slate-700">Materials Used: <strong className="text-slate-900">{task.lastReport.materialUsed}</strong></p>
              <p className="text-slate-700">Remarks: <span className="text-slate-500">{task.lastReport.notes || 'None recorded.'}</span></p>
              
              {task.lastReport.coords?.lat && (
                <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-emerald-700 font-medium">
                  <MapPin size={14} />
                  <span>GPS Confirmed: Lat {task.lastReport.coords.lat}, Lng {task.lastReport.coords.lng}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
              No field entries logged yet for this schedule task.
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs py-2.5 rounded-xl font-semibold transition"
        >
          Close Detail View
        </button>
      </div>
    </div>
  );
}