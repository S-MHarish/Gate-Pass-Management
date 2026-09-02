'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileCheck2,
  Search,
  CheckSquare,
  Square,
  Users,
  Building,
  Sparkles,
  Trash2,
  Download,
  Printer,
  FileText,
  Clock,
  ArrowUpDown,
  RotateCcw,
  CheckCircle2,
  Filter,
  X,
  Phone,
} from 'lucide-react';
import { Student, GatePass } from '@/types';
import { useRealtime } from '@/context/RealtimeContext';
import { compareRoomNumbers } from '@/lib/roomUtils';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';
import { Badge } from '@/components/ui/Badge';
import { GatePassPreviewModal } from '@/components/pass/GatePassPreviewModal';
import { downloadGatePassPDF } from '@/lib/pdfGenerator';
import { downloadGatePassDocx } from '@/lib/docxGenerator';

function GeneratePassContent() {
  const searchParams = useSearchParams();
  const reuseId = searchParams.get('reuse');

  const { students, passes, hostelInfo, createPass } = useRealtime();
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Gate Pass Metadata
  const [outDate, setOutDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [outTime, setOutTime] = useState<string>('05:30 PM');
  const [expectedInTime, setExpectedInTime] = useState<string>('08:30 PM');
  const [purpose, setPurpose] = useState<string>('General Evening Outing & Permission');
  const [notes, setNotes] = useState<string>('');
  const [includeParentPhone, setIncludeParentPhone] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal Preview
  const [activePass, setActivePass] = useState<GatePass | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  useEffect(() => {
    if (reuseId && passes.length > 0) {
      const targetPass = passes.find((p) => p.id === reuseId || p.passNumber === reuseId);
      if (targetPass) {
        setSelectedStudentIds(new Set(targetPass.students.map((s) => s.id)));
        setPurpose(targetPass.purpose);
        setOutTime(targetPass.outTime);
        setExpectedInTime(targetPass.expectedInTime);
        setIncludeParentPhone(Boolean(targetPass.includeParentPhone));
      }
    }
  }, [reuseId, passes]);

  const uniqueRooms = useMemo(() => {
    const set = new Set(students.map((s) => s.roomNo));
    return Array.from(set).sort(compareRoomNumbers);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Room match
      const cleanRoom = roomFilter.replace(/[^0-9]/g, '');
      const studentClean = s.roomNo.replace(/[^0-9]/g, '');
      const matchRoom =
        !roomFilter ||
        (cleanRoom && studentClean && (studentClean === cleanRoom || studentClean.padStart(2, '0') === cleanRoom.padStart(2, '0'))) ||
        s.roomNo.toLowerCase() === roomFilter.toLowerCase();

      // Search query
      const q = searchQuery.trim().toLowerCase();
      const cleanQ = q.replace(/[^0-9]/g, '');
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.parentPhone && s.parentPhone.toLowerCase().includes(q)) ||
        s.department.toLowerCase().includes(q) ||
        s.roomNo.toLowerCase().includes(q) ||
        `room ${s.roomNo}`.toLowerCase().includes(q) ||
        `r-${s.roomNo}`.toLowerCase().includes(q) ||
        (cleanQ !== '' && s.roomNo.replace(/^0+/, '') === cleanQ.replace(/^0+/, '')) ||
        String(s.sNo) === q;

      const matchYear = yearFilter === 'ALL' || s.year === yearFilter;
      const matchDept = deptFilter === 'ALL' || s.department.toUpperCase() === deptFilter.toUpperCase();

      return matchRoom && matchSearch && matchYear && matchDept;
    });
  }, [students, roomFilter, searchQuery, yearFilter, deptFilter]);

  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.has(s.id));
  }, [students, selectedStudentIds]);

  // Actions
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedStudentIds(new Set(students.map((s) => s.id)));
    setPurpose('Month-End Hometown Leave (All Members)');
    setExpectedInTime('Next Monday 07:00 PM');
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const handleSelectFiltered = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleSelectByRoom = (room: string) => {
    const roomClean = room.replace(/[^0-9]/g, '');
    const inRoom = students.filter((s) => {
      const sc = s.roomNo.replace(/[^0-9]/g, '');
      return s.roomNo === room || (roomClean && sc && (sc === roomClean || sc.padStart(2, '0') === roomClean.padStart(2, '0')));
    });
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      const allSelected = inRoom.every((s) => next.has(s.id));
      if (allSelected) {
        inRoom.forEach((s) => next.delete(s.id));
      } else {
        inRoom.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleGeneratePass = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least 1 student.');
      return;
    }

    const dateObj = new Date(outDate);
    const formattedDate = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : outDate;

    const rooms = Array.from(new Set(selectedStudents.map((s) => s.roomNo))).sort(compareRoomNumbers);
    const passType =
      selectedStudents.length === students.length
        ? 'MONTH_END'
        : rooms.length === 1
        ? 'ROOM_WISE'
        : 'CUSTOM';

    setIsGenerating(true);
    const res = await createPass({
      date: outDate,
      formattedDate,
      outTime,
      expectedInTime,
      purpose,
      passType,
      studentCount: selectedStudents.length,
      students: selectedStudents,
      roomsIncluded: rooms,
      includeParentPhone,
      generatedBy: 'Warden (Boys Hostel-I)',
      notes,
    });
    setIsGenerating(false);

    if (res.success && res.pass) {
      setActivePass(res.pass);
      setIsPreviewOpen(true);
    } else {
      alert(res.error || 'Failed to save gate pass.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gate Pass Generator
            </h1>
            <Badge variant="cyan">Official VSB Format</Badge>
          </div>
          <p className="text-sm text-emerald-300/80 mt-1">
            Build customized or full month-end gate passes. Instant real-time multi-device synchronization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Select All {students.length} Members</span>
          </button>

          <button
            onClick={handleDeselectAll}
            className="px-4 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-gray-300 text-xs sm:text-sm font-semibold border border-emerald-500/20 transition-colors"
          >
            Clear Selection
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols): Student Selector */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-6">
            
            {/* Header */}
            <div className="pb-4 border-b border-emerald-500/20 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Select Students ({selectedStudents.length} selected)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Search by name, room number, or click rooms.
                </p>
              </div>

              <button
                onClick={handleSelectFiltered}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/30"
              >
                + Select Filtered ({filteredStudents.length})
              </button>
            </div>

            {/* Room Fast Buttons */}
            <div className="py-3 border-b border-emerald-500/10">
              <span className="text-xs font-semibold text-gray-400 block mb-1.5">
                Fast Room Selection:
              </span>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                <button
                  onClick={() => setRoomFilter('')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    !roomFilter ? 'bg-emerald-500 text-black' : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  All
                </button>
                {uniqueRooms.map((room) => {
                  const roomClean = room.replace(/[^0-9]/g, '');
                  const inRoom = students.filter((s) => {
                    const sc = s.roomNo.replace(/[^0-9]/g, '');
                    return s.roomNo === room || (roomClean && sc && (sc === roomClean || sc.padStart(2, '0') === roomClean.padStart(2, '0')));
                  });
                  const allSel = inRoom.length > 0 && inRoom.every((s) => selectedStudentIds.has(s.id));
                  return (
                    <button
                      key={room}
                      onClick={() => handleSelectByRoom(room)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                        allSel
                          ? 'bg-cyan-500 text-black'
                          : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      R-{room} ({inRoom.length})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 py-3 border-b border-emerald-500/10">
              <div className="sm:col-span-8 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-emerald-400" />
                <input
                  type="text"
                  placeholder="Search name, room, parent phone, or S.No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="sm:col-span-2">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full py-1.5 px-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-emerald-200"
                >
                  <option value="ALL">All Years</option>
                  <option value="II">II Year</option>
                  <option value="III">III Year</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full py-1.5 px-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-emerald-200"
                >
                  <option value="ALL">All Depts</option>
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="AI&DS">AI&DS</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                </select>
              </div>
            </div>

            {/* Student List */}
            <div className="mt-3 max-h-[480px] overflow-y-auto divide-y divide-emerald-500/10 border border-emerald-500/20 rounded-xl bg-[#03211b]/80">
              {filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No students found matching current filters.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSel = selectedStudentIds.has(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSel ? 'bg-emerald-500/20' : 'hover:bg-emerald-900/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleStudent(student.id)}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 accent-emerald-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              R-{student.roomNo}
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-white">
                              {student.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {student.department} • {student.year} Year • S.No: {student.sNo}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-mono text-emerald-300">
                        {student.parentPhone || ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

          </GlassCard>
        </div>

        {/* Right Column (5 cols): Pass Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6 sticky top-24">
            
            <div className="pb-4 border-b border-emerald-500/20">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <span>Gate Pass Details</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Timings, reason, and output configuration.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              
              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Pass Date:
                </label>
                <input
                  type="date"
                  value={outDate}
                  onChange={(e) => setOutDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Out Time:
                  </label>
                  <input
                    type="text"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Expected In Time:
                  </label>
                  <input
                    type="text"
                    value={expectedInTime}
                    onChange={(e) => setExpectedInTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Purpose / Reason:
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Optional Parent Phone Number Checkbox */}
              <div className="pt-1">
                <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 cursor-pointer hover:bg-emerald-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeParentPhone}
                    onChange={(e) => setIncludeParentPhone(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-200">Include Parent Phone Number</span>
                    <p className="text-[11px] text-gray-400">Adds PARENT NO. column to PDF/Word/Print</p>
                  </div>
                </label>
              </div>

              {/* Summary Box */}
              <div className="p-4 rounded-xl bg-[#022019] border border-emerald-500/25 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Selected:</span>
                  <span className="font-bold text-white text-sm">
                    {selectedStudents.length} Students
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rooms Included:</span>
                  <span className="font-semibold text-emerald-300">
                    {Array.from(new Set(selectedStudents.map((s) => s.roomNo))).length} Rooms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Document Layout:</span>
                  <span className="font-semibold text-cyan-300">
                    Official VSB College Table {includeParentPhone ? '(6 columns)' : '(5 columns)'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <GlowingButton
                variant="primary"
                size="lg"
                icon={FileCheck2}
                disabled={selectedStudents.length === 0}
                loading={isGenerating}
                onClick={handleGeneratePass}
                className="w-full justify-center"
              >
                Generate Pass ({selectedStudents.length})
              </GlowingButton>

            </div>

          </GlassCard>
        </div>

      </div>

      <GatePassPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pass={activePass}
        hostelInfo={hostelInfo}
      />

    </div>
  );
}

export default function GeneratePassPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-emerald-400">Loading pass builder...</div>}>
      <GeneratePassContent />
    </Suspense>
  );
}
