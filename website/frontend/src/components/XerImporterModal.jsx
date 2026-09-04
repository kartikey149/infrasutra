import React, { useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, X, FileText, Loader2 } from 'lucide-react';
import { mockApi } from '../services/mockApi';

export default function XerImporterModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  if (!isOpen) return null;

  const handleFileDrop = (e) => {
    e.preventDefault();
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      parseFile(uploadedFile);
    }
  };

  const parseFile = (file) => {
    setParsing(true);
    setTimeout(() => {
      setParsing(false);
      setParsedData({
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + ' KB',
        wbsCount: 6,
        activityCount: 24,
        baselineStartDate: '2026-01-05',
        baselineFinishDate: '2026-11-30',
        criticalActivities: 3,
      });
    }, 1200);
  };

  const handleConfirmImport = async () => {
    await mockApi.resetData();
    onImportSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl max-w-lg w-full p-6 space-y-5 text-slate-900 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl border border-slate-300">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Import Primavera P6 / MS Project Schedule</h3>
            <p className="text-xs text-slate-500">Supports .XER, .XML, and .MPP file formats</p>
          </div>
        </div>

        {!parsedData ? (
          <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50">
            <Upload size={28} className="text-slate-600 mb-2" />
            <span className="text-xs font-semibold text-slate-900">Drag & Drop .XER Schedule File</span>
            <span className="text-[10px] text-slate-500 mt-1">or click to browse from computer</span>
            <input type="file" accept=".xer,.xml,.mpp" onChange={handleFileDrop} className="hidden" />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <FileText size={18} className="text-slate-700 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-medium text-slate-900 truncate">{parsedData.fileName}</p>
                  <p className="text-[10px] text-slate-500">{parsedData.fileSize}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-semibold">
                Parsed Successfully
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 text-[10px]">WBS Elements</span>
                <p className="font-bold text-slate-900 mt-0.5">{parsedData.wbsCount} WBS Nodes</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 text-[10px]">Total Activities</span>
                <p className="font-bold text-slate-900 mt-0.5">{parsedData.activityCount} Tasks</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 text-[10px]">Project Finish</span>
                <p className="font-bold text-slate-900 mt-0.5">{parsedData.baselineFinishDate}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 text-[10px]">Critical Path Float</span>
                <p className="font-bold text-rose-700 mt-0.5">{parsedData.criticalActivities} Zero-Float Tasks</p>
              </div>
            </div>
          </div>
        )}

        {parsing && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-700 py-2">
            <Loader2 size={16} className="animate-spin" />
            <span>Parsing WBS hierarchy and Primavera relationships...</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2.5 rounded-xl font-medium transition border border-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!parsedData}
            className="w-1/2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 size={15} /> Apply to Workspace
          </button>
        </div>
      </div>
    </div>
  );
}