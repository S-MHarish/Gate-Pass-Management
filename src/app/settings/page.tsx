'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Save,
  RotateCcw,
  ShieldCheck,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { HostelInfo } from '@/types';
import {
  getHostelInfo,
  saveHostelInfo,
  getStudents,
  resetMasterDatabase,
  saveStudents,
  getGatePasses,
} from '@/lib/storage';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { saveBlobFile } from '@/lib/fileSaver';

export default function SettingsPage() {
  const [info, setInfo] = useState<HostelInfo>(getHostelInfo());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 97, totalPasses: 2 });

  useEffect(() => {
    setInfo(getHostelInfo());
    const students = getStudents();
    const passes = getGatePasses();
    setStats({ totalStudents: students.length, totalPasses: passes.length });
  }, []);

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    saveHostelInfo(info);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetToDefault = () => {
    resetMasterDatabase();
    setIsResetModalOpen(false);
    const updated = getStudents();
    setStats((prev) => ({ ...prev, totalStudents: updated.length }));
    alert('Master student database reset to default 97 students for VSB Boys Hostel-I.');
  };

  const handleBackupDatabase = () => {
    const students = getStudents();
    const passes = getGatePasses();
    const hostel = getHostelInfo();

    const backup = {
      timestamp: new Date().toISOString(),
      college: 'VSB Engineering College',
      hostelInfo: hostel,
      students,
      gatePasses: passes,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    saveBlobFile(blob, `VSB_Hostel_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.students && Array.isArray(json.students)) {
          saveStudents(json.students);
          if (json.hostelInfo) saveHostelInfo(json.hostelInfo);
          setStats((prev) => ({ ...prev, totalStudents: json.students.length }));
          alert(`Successfully restored backup with ${json.students.length} students.`);
        } else {
          alert('Invalid backup format.');
        }
      } catch (err) {
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hostel System Settings
          </h1>
          <Badge variant="cyan">Admin Authority</Badge>
        </div>
        <p className="text-sm text-emerald-300/80 mt-1">
          Configure official document headers, warden signature labels, and manage master database integrity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols): Document Header & Signatures */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-6">
            
            <div className="pb-4 border-b border-emerald-500/20 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Building className="w-5 h-5 text-emerald-400" />
                  <span>Official Document Header Configuration</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  These titles appear directly on the generated A4 PDF and Word document.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveInfo} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  College Name (Top Header):
                </label>
                <input
                  type="text"
                  required
                  value={info.collegeName}
                  onChange={(e) => setInfo({ ...info, collegeName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white font-bold uppercase focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Hostel Name / Block (Second Line):
                </label>
                <input
                  type="text"
                  required
                  value={info.hostelName}
                  onChange={(e) => setInfo({ ...info, hostelName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Pass Title / Scope (Third Line):
                </label>
                <input
                  type="text"
                  required
                  value={info.passTitle}
                  onChange={(e) => setInfo({ ...info, passTitle: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Left Signature Title:
                  </label>
                  <input
                    type="text"
                    required
                    value={info.asstWarden}
                    onChange={(e) => setInfo({ ...info, asstWarden: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-xs text-white font-bold uppercase focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Right Signature Title:
                  </label>
                  <input
                    type="text"
                    required
                    value={info.deputyWarden}
                    onChange={(e) => setInfo({ ...info, deputyWarden: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-xs text-white font-bold uppercase focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-emerald-500/20">
                {savedSuccess ? (
                  <span className="text-xs text-emerald-300 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Settings Saved Successfully!</span>
                  </span>
                ) : (
                  <span />
                )}

                <GlowingButton variant="primary" size="md" icon={Save} type="submit">
                  Save Changes
                </GlowingButton>
              </div>
            </form>

          </GlassCard>
        </div>

        {/* Right Column (5 cols): Database Management & Backups */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6">
            
            <div className="pb-4 border-b border-emerald-500/20">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <span>Master Database Management</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Safe storage, backup &amp; recovery options.
              </p>
            </div>

            <div className="pt-4 space-y-4">
              
              {/* Stats overview */}
              <div className="p-4 rounded-2xl bg-[#022019] border border-emerald-500/30 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Total Registered Members:</span>
                  <span className="font-bold text-white text-sm">{stats.totalStudents}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Active Pass History Records:</span>
                  <span className="font-bold text-white text-sm">{stats.totalPasses}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Storage Engine:</span>
                  <span className="font-semibold text-emerald-300">Local Master Registry</span>
                </div>
              </div>

              {/* Backup & Restore buttons */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-gray-300 block">
                  Data Backup &amp; Portability:
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleBackupDatabase}
                    className="p-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Backup Database</span>
                  </button>

                  <label className="p-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer text-center">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Restore Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Reset to Factory Default */}
              <div className="pt-4 border-t border-emerald-500/20">
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Reset Master Registry:
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  Reload the original 97 student roster for VSB Boys Hostel-I (Rooms 01–22).
                </p>
                <button
                  onClick={() => setIsResetModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default 97 Students</span>
                </button>
              </div>

            </div>

          </GlassCard>
        </div>

      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Master Database to Default?"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Warning: Database Reset</p>
              <p className="text-xs text-red-300 mt-1">
                This will overwrite the current student list with the default official 97 students distributed across Rooms 01 to 22.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <GlowingButton variant="danger" size="md" onClick={handleResetToDefault}>
              Confirm Reset
            </GlowingButton>
          </div>
        </div>
      </Modal>

    </div>
  );
}
