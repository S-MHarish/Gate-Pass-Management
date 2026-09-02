'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History,
  FileCheck2,
  Download,
  Printer,
  FileText,
  RotateCcw,
  Search,
  Calendar,
  Eye,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Building,
  Users,
  Clock,
  Sparkles,
  Phone,
} from 'lucide-react';
import { GatePass } from '@/types';
import { useRealtime } from '@/context/RealtimeContext';
import { downloadGatePassPDF } from '@/lib/pdfGenerator';
import { downloadGatePassDocx } from '@/lib/docxGenerator';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { GatePassPreviewModal } from '@/components/pass/GatePassPreviewModal';

export default function PassHistoryPage() {
  const router = useRouter();
  const { passes, hostelInfo, deletePass: apiDeletePass } = useRealtime();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedPass, setSelectedPass] = useState<GatePass | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [passToDelete, setPassToDelete] = useState<GatePass | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredPasses = useMemo(() => {
    return passes.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.passNumber.toLowerCase().includes(q) ||
        p.purpose.toLowerCase().includes(q) ||
        p.roomsIncluded.some((r) => r.includes(q)) ||
        p.students.some((s) => s.name.toLowerCase().includes(q));

      const matchDate = !dateFilter || p.date === dateFilter;

      return matchSearch && matchDate;
    });
  }, [passes, searchQuery, dateFilter]);

  const handleOpenPreview = (pass: GatePass) => {
    setSelectedPass(pass);
    setIsPreviewOpen(true);
  };

  const handleReusePass = (pass: GatePass) => {
    router.push(`/generate?reuse=${pass.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!passToDelete) return;
    setIsDeleting(true);
    await apiDeletePass(passToDelete.id);
    setIsDeleting(false);
    setPassToDelete(null);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gate Pass Archive &amp; History
            </h1>
            <Badge variant="amber">{passes.length} Total Passes</Badge>
          </div>
          <p className="text-sm text-emerald-300/80 mt-1">
            Complete historical audit trail stored centrally and synchronized across all connected devices.
          </p>
        </div>

        <Link href="/generate">
          <GlowingButton variant="primary" icon={Sparkles}>
            Create New Gate Pass
          </GlowingButton>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <GlassCard className="p-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pb-6 border-b border-emerald-500/20">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-emerald-400" />
            <input
              type="text"
              placeholder="Search by Pass ID (e.g. GP-2026...), Student Name, Room, or Purpose"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-[#021d17] border border-emerald-500/30 rounded-xl text-sm text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="sm:col-span-4 relative">
            <Calendar className="w-4 h-4 absolute left-3 top-3.5 text-emerald-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-[#021d17] border border-emerald-500/30 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Passes List / Grid */}
        <div className="pt-6 space-y-4">
          {filteredPasses.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <History className="w-10 h-10 mx-auto text-emerald-500/40 mb-2" />
              <p className="font-bold text-white">No historical passes found</p>
              <p className="text-xs text-gray-500 mt-1">Try clearing your filters or create a new pass.</p>
            </div>
          ) : (
            filteredPasses.map((pass) => (
              <div
                key={pass.id}
                className="p-5 rounded-2xl bg-[#03231c]/90 border border-emerald-500/25 hover:border-emerald-400/50 transition-all duration-200 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
              >
                {/* Pass info & meta */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                      {pass.passNumber}
                    </span>
                    <Badge variant={pass.studentCount > 50 ? 'cyan' : 'emerald'}>
                      {pass.studentCount} Students
                    </Badge>
                    {pass.includeParentPhone && (
                      <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                        + Parent Phone
                      </span>
                    )}
                    <span className="text-xs text-gray-400 font-medium flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>{pass.formattedDate || pass.date} • {pass.outTime || '05:30 PM'}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {pass.purpose || 'Common Hostel Gate Pass'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <div>
                      <span className="text-emerald-400/80">Rooms: </span>
                      <span className="text-gray-200 font-medium">
                        {pass.roomsIncluded.length > 8
                          ? `All ${pass.roomsIncluded.length} Rooms (Month-End)`
                          : pass.roomsIncluded.map((r) => `R-${r}`).join(', ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-400/80">Expected In: </span>
                      <span className="text-gray-200 font-medium">{pass.expectedInTime || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400/80">Authorized by: </span>
                      <span className="text-gray-200 font-medium">{pass.generatedBy}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-emerald-500/20">
                  <button
                    onClick={() => handleOpenPreview(pass)}
                    className="px-3 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold flex items-center space-x-1.5 border border-emerald-500/30 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View A4</span>
                  </button>

                  <button
                    onClick={() => handleReusePass(pass)}
                    className="px-3 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-bold flex items-center space-x-1.5 border border-cyan-500/40 shadow-sm transition-colors"
                    title="Load this exact student list into pass generator"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reuse Pass</span>
                  </button>

                  <button
                    onClick={() => downloadGatePassPDF(pass, hostelInfo)}
                    className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-white text-xs font-semibold"
                    title="Download Official PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => downloadGatePassDocx(pass, hostelInfo)}
                    className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-white text-xs font-semibold"
                    title="Download Word (.docx)"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPassToDelete(pass)}
                    className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-red-200 text-xs transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </GlassCard>

      {/* Preview Modal */}
      <GatePassPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pass={selectedPass}
        hostelInfo={hostelInfo}
      />

      {/* Delete Modal */}
      <Modal
        isOpen={!!passToDelete}
        onClose={() => setPassToDelete(null)}
        title="Confirm Deleting Historical Pass"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to remove pass{' '}
            <span className="font-bold text-white font-mono">{passToDelete?.passNumber}</span>?
            This will remove the pass audit record from the central database and all connected devices.
          </p>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={() => setPassToDelete(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <GlowingButton variant="danger" size="md" loading={isDeleting} onClick={handleConfirmDelete}>
              Delete Pass
            </GlowingButton>
          </div>
        </div>
      </Modal>

    </div>
  );
}
