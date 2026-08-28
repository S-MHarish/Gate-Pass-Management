'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Student, GatePass } from '@/types';
import {
  getStudents,
  saveGatePass,
  getHostelInfo,
  getGatePasses,
  compareRoomNumbers,
} from '@/lib/storage';
import { INITIAL_STUDENTS } from '@/lib/seedData';
import { Suspense } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';
import { Badge } from '@/components/ui/Badge';
import { GatePassPreviewModal } from '@/components/pass/GatePassPreviewModal';

function GeneratePassContent() {
  const searchParams = useSearchParams();
  const reuseId = searchParams.get('reuse');

  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
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

  // Modal Preview
  const [activePass, setActivePass] = useState<GatePass | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadedStudents = getStudents();
    setStudents(loadedStudents);

    // If reuse parameter is in URL
    if (reuseId) {
      const allPasses = getGatePasses();
      const targetPass = allPasses.find((p) => p.id === reuseId || p.passNumber === reuseId);
      if (targetPass) {
        setSelectedStudentIds(new Set(targetPass.students.map((s) => s.id)));
        setPurpose(targetPass.purpose);
        setOutTime(targetPass.outTime);
        setExpectedInTime(targetPass.expectedInTime);
      }
    }
  }, [reuseId]);

  const uniqueRooms = useMemo(() => {
    const set = new Set(students.map((s) => s.roomNo));
    return Array.from(set).sort(compareRoomNumbers);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Room match (handles "1", "Room 1", "01", "R-1", etc.)
      const cleanRoom = roomFilter.replace(/[^0-9]/g, '');
      const studentClean = s.roomNo.replace(/[^0-9]/g, '');
      const matchRoom =
        !roomFilter ||
        (cleanRoom && studentClean && (studentClean === cleanRoom || studentClean.padStart(2, '0') === cleanRoom.padStart(2, '0'))) ||
        s.roomNo.toLowerCase() === roomFilter.toLowerCase();

      // Search query (handles student name, room, department, phone, or sNo)
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
      const sClean = s.roomNo.replace(/[^0-9]/g, '');
      return s.roomNo === room || (roomClean && sClean && (sClean === roomClean || sClean.padStart(2, '0') === roomClean.padStart(2, '0')));
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

  const handleSelectByYear = (year: 'II' | 'III') => {
    const inYear = students.filter((s) => s.year === year);
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      inYear.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleRemoveStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleGenerate = () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least 1 student.');
      return;
    }

    const dateObj = new Date(outDate);
    const formattedDate = dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const roomsUsed = Array.from(new Set(selectedStudents.map((s) => s.roomNo))).sort();
    const isMonthEnd = selectedStudents.length === students.length;

    const pass = saveGatePass({
      date: outDate,
      formattedDate,
      outTime,
      expectedInTime,
      purpose,
      passType: isMonthEnd ? 'MONTH_END' : roomsUsed.length === 1 ? 'ROOM_WISE' : 'CUSTOM',
      studentCount: selectedStudents.length,
      students: selectedStudents,
      roomsIncluded: roomsUsed,
      generatedBy: 'Warden (Boys Hostel-I)',
      notes,
    });

    setActivePass(pass);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gate Pass Generator
            </h1>
            <Badge variant="cyan">A4 Formal Engine</Badge>
          </div>
          <p className="text-sm text-emerald-300/80 mt-1">
            Search room, select students, and generate official VSB college printable document.
          </p>
        </div>

        {/* 1-Click Fast Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center space-x-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Select All ({students.length})</span>
          </button>
          <button
            onClick={() => handleSelectByYear('II')}
            className="px-3 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
          >
            Select II Year
          </button>
          <button
            onClick={() => handleSelectByYear('III')}
            className="px-3 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
          >
            Select III Year
          </button>
          {selectedStudentIds.size > 0 && (
            <button
              onClick={handleDeselectAll}
              className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 text-xs font-semibold"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Split: Selector vs Selected Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left (7 cols): Room search & Student check table */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-6">
            
            <div className="space-y-4">
              
              {/* Room search bar with quick jump */}
              <div>
                <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-1.5">
                  1. Search Room (Example: type &quot;10&quot; or &quot;Room 10&quot;):
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3.5 top-3.5 text-emerald-400" />
                  <input
                    type="text"
                    placeholder="Enter Room Number (e.g. 10)"
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                  {roomFilter && (
                    <button
                      onClick={() => setRoomFilter('')}
                      className="absolute right-3 top-3 text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Room Quick Pills */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                  Or pick a room directly:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-[#021a15] rounded-xl border border-emerald-500/20">
                  {uniqueRooms.map((r) => {
                    const roomStudents = students.filter((s) => s.roomNo === r);
                    const selectedInRoom = roomStudents.filter((s) => selectedStudentIds.has(s.id)).length;
                    const isActive = roomFilter === r || roomFilter === `Room ${r}`;

                    return (
                      <button
                        key={r}
                        onClick={() => setRoomFilter(roomFilter === r ? '' : r)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                            : selectedInRoom === roomStudents.length && roomStudents.length > 0
                            ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                            : selectedInRoom > 0
                            ? 'bg-emerald-900 text-emerald-200 border border-emerald-400'
                            : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300/80 border border-emerald-500/20'
                        }`}
                      >
                        R-{r} ({selectedInRoom}/{roomStudents.length})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Additional Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2">
                <div className="sm:col-span-6 relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-emerald-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or phone"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full py-2 px-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-emerald-200 focus:outline-none"
                  >
                    <option value="ALL">All Years</option>
                    <option value="II">II Year</option>
                    <option value="III">III Year</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="w-full py-2 px-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-emerald-200 focus:outline-none"
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

              {/* Available Students Table */}
              <div className="border border-emerald-500/20 rounded-2xl overflow-hidden bg-[#03211b]/90">
                <div className="p-2.5 bg-[#042d25] border-b border-emerald-500/30 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    Showing {filteredStudents.length} Students
                  </span>
                  <button
                    onClick={handleSelectFiltered}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold border border-emerald-400/30"
                  >
                    + Select All Filtered ({filteredStudents.length})
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#063b31] text-emerald-300 uppercase font-bold text-[10px] z-10">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">Select</th>
                        <th className="py-2.5 px-2 text-center w-12">Room</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-2 text-center">Dept</th>
                        <th className="py-2.5 px-2 text-center">Year</th>
                        <th className="py-2.5 px-3 text-center">Parent Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-500/10">
                      {filteredStudents.map((student) => {
                        const isSelected = selectedStudentIds.has(student.id);

                        return (
                          <tr
                            key={student.id}
                            onClick={() => toggleStudent(student.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-500/20 text-white font-semibold'
                                : 'hover:bg-emerald-900/30 text-gray-200'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudent(student.id)}
                                className="w-4 h-4 rounded text-emerald-500 cursor-pointer accent-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-emerald-300">
                              {student.roomNo}
                            </td>
                            <td className="py-2 px-3 font-medium text-white">
                              {student.name}
                            </td>
                            <td className="py-2 px-2 text-center text-emerald-300">
                              {student.department}
                            </td>
                            <td className="py-2 px-2 text-center text-gray-400">
                              {student.year}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-gray-300">
                              {student.parentPhone}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </GlassCard>
        </div>

        {/* Right (5 cols): Selected Students Roster & Gate Pass Details */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6 border-emerald-400/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            
            <div className="pb-4 border-b border-emerald-500/20 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Selected Roster ({selectedStudents.length})</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Students ready for the printed gate pass.
                </p>
              </div>

              {selectedStudents.length > 0 && (
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Selected Students Scrollable List */}
            <div className="pt-4 space-y-4">
              
              <div className="border border-emerald-500/20 rounded-xl overflow-hidden bg-[#021d17] max-h-60 overflow-y-auto">
                {selectedStudents.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-emerald-500/40" />
                    <p className="text-xs font-semibold text-emerald-200">No students selected yet</p>
                    <p className="text-[11px] text-gray-500">
                      Pick students from the left table or click &quot;Select All&quot; above.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#06382e] text-emerald-300 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="py-2 px-2 text-center w-8">#</th>
                        <th className="py-2 px-2 text-center w-12">Room</th>
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-2 text-center">Dept</th>
                        <th className="py-2 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-500/10">
                      {selectedStudents.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-emerald-900/30">
                          <td className="py-1.5 px-2 text-center text-gray-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2 text-center font-bold text-emerald-300">
                            {s.roomNo}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-white truncate max-w-[120px]">
                            {s.name}
                          </td>
                          <td className="py-1.5 px-2 text-center text-[11px] text-emerald-400">
                            {s.department}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              onClick={() => handleRemoveStudent(s.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Remove"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pass Metadata Settings */}
              <div className="space-y-3 pt-2">
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

                <div className="grid grid-cols-2 gap-2">
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
                      Expected In:
                    </label>
                    <input
                      type="text"
                      value={expectedInTime}
                      onChange={(e) => setExpectedInTime(e.target.value)}
                      className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Purpose:
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Optional Notes:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Approved by Warden / Principal"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Action Button */}
              <GlowingButton
                variant="primary"
                size="lg"
                icon={FileCheck2}
                disabled={selectedStudents.length === 0}
                onClick={handleGenerate}
                className="w-full shadow-[0_0_25px_rgba(16,185,129,0.5)] mt-2"
              >
                GENERATE &amp; PREVIEW GATE PASS ({selectedStudents.length})
              </GlowingButton>

            </div>

          </GlassCard>
        </div>

      </div>

      {/* Preview Modal */}
      <GatePassPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pass={activePass}
        hostelInfo={getHostelInfo()}
      />

    </div>
  );
}

export default function GeneratePassPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-emerald-400 font-display">Loading Gate Pass Generator...</div>}>
      <GeneratePassContent />
    </Suspense>
  );
}
