'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Building,
  FileCheck2,
  Calendar,
  Search,
  CheckSquare,
  Square,
  ArrowRight,
  Download,
  FileText,
  RotateCcw,
  Sparkles,
  Zap,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Student, GatePass } from '@/types';
import { useRealtime } from '@/context/RealtimeContext';
import { compareRoomNumbers } from '@/lib/roomUtils';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';
import { Badge } from '@/components/ui/Badge';
import { GatePassPreviewModal } from '@/components/pass/GatePassPreviewModal';
import { downloadGatePassPDF } from '@/lib/pdfGenerator';
import { downloadGatePassDocx } from '@/lib/docxGenerator';

export default function DashboardPage() {
  const { students, passes, hostelInfo, createPass } = useRealtime();
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Search & Filter State
  const [roomQuery, setRoomQuery] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Gate Pass Options
  const [outTime, setOutTime] = useState<string>('05:30 PM');
  const [expectedInTime, setExpectedInTime] = useState<string>('08:30 PM');
  const [purpose, setPurpose] = useState<string>('General Evening Outing & Permission');
  const [includeParentPhone, setIncludeParentPhone] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Preview Modal
  const [activePreviewPass, setActivePreviewPass] = useState<GatePass | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Compute key stats
  const totalStudents = students.length;
  const uniqueRooms = useMemo(() => {
    const set = new Set(students.map((s) => s.roomNo));
    return Array.from(set).sort(compareRoomNumbers);
  }, [students]);

  const totalRoomsCount = uniqueRooms.length || 22;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPasses = useMemo(() => {
    return passes.filter((p) => p.date === todayStr);
  }, [passes, todayStr]);

  // Filtered Students for Quick Selection
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Room match (handles "1", "Room 1", "01", "R-1", etc.)
      const cleanRoom = roomQuery.replace(/[^0-9]/g, '');
      const studentClean = s.roomNo.replace(/[^0-9]/g, '');
      const matchRoom =
        !roomQuery ||
        (cleanRoom && studentClean && (studentClean === cleanRoom || studentClean.padStart(2, '0') === cleanRoom.padStart(2, '0'))) ||
        s.roomNo.toLowerCase() === roomQuery.toLowerCase();

      // Student name / phone / id / room search
      const q = studentSearchQuery.trim().toLowerCase();
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

      // Year filter
      const matchYear = selectedYear === 'ALL' || s.year === selectedYear;

      // Dept filter
      const matchDept = selectedDept === 'ALL' || s.department.toUpperCase() === selectedDept.toUpperCase();

      return matchRoom && matchSearch && matchYear && matchDept;
    });
  }, [students, roomQuery, studentSearchQuery, selectedYear, selectedDept]);

  // Selected Students Array (always sorted room-wise)
  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.has(s.id));
  }, [students, selectedStudentIds]);

  // Selection Handlers
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllMembers = () => {
    const allIds = new Set(students.map((s) => s.id));
    setSelectedStudentIds(allIds);
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

  const handleSelectByRoom = (roomNo: string) => {
    const roomClean = roomNo.replace(/[^0-9]/g, '');
    const roomStudents = students.filter((s) => {
      const sClean = s.roomNo.replace(/[^0-9]/g, '');
      return s.roomNo === roomNo || (roomClean && sClean && (sClean === roomClean || sClean.padStart(2, '0') === roomClean.padStart(2, '0')));
    });
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      const allSelected = roomStudents.every((s) => next.has(s.id));
      if (allSelected) {
        roomStudents.forEach((s) => next.delete(s.id));
      } else {
        roomStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  // Generate Gate Pass with central persistence & real-time sync
  const handleGeneratePass = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least 1 student to generate a gate pass.');
      return;
    }

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const roomsUsed = Array.from(new Set(selectedStudents.map((s) => s.roomNo))).sort(compareRoomNumbers);
    const isMonthEnd = selectedStudents.length === totalStudents;

    setIsGenerating(true);
    const res = await createPass({
      date: today.toISOString().slice(0, 10),
      formattedDate,
      outTime,
      expectedInTime,
      purpose,
      passType: isMonthEnd ? 'MONTH_END' : roomsUsed.length === 1 ? 'ROOM_WISE' : 'CUSTOM',
      studentCount: selectedStudents.length,
      students: selectedStudents,
      roomsIncluded: roomsUsed,
      includeParentPhone,
      generatedBy: 'Warden (Boys Hostel-I)',
    });
    setIsGenerating(false);

    if (res.success && res.pass) {
      setActivePreviewPass(res.pass);
      setIsModalOpen(true);
    } else {
      alert(res.error || 'Failed to save gate pass to central database.');
    }
  };

  // Reuse previous pass handler
  const handleReusePass = (pass: GatePass) => {
    const ids = new Set(pass.students.map((s) => s.id));
    setSelectedStudentIds(ids);
    setPurpose(pass.purpose);
    setOutTime(pass.outTime);
    setExpectedInTime(pass.expectedInTime);
    setIncludeParentPhone(Boolean(pass.includeParentPhone));
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Welcome & Quick Stats */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hostel Gate Pass Dashboard
            </h1>
            <Badge variant="emerald">Live Master Sync</Badge>
          </div>
          <p className="text-sm text-emerald-300/80 mt-1">
            VSB Engineering College • Boys Hostel-I (New Construction First Floor)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSelectAllMembers}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-bold text-sm shadow-[0_0_20px_rgba(56,189,248,0.4)] flex items-center space-x-2 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Select All {totalStudents} Members (Month-End)</span>
          </button>

          <Link href="/generate">
            <GlowingButton variant="primary" icon={ArrowRight} iconPosition="right">
              Full Pass Builder
            </GlowingButton>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Registered Students"
          value={totalStudents}
          subtitle="Active Hostel Members in Rooms 01–22"
          icon={Users}
          variant="emerald"
          trend="Permanent Master"
        />

        <StatCard
          title="Total Rooms Active"
          value={totalRoomsCount}
          subtitle="New Construction 1st Floor"
          icon={Building}
          variant="cyan"
          trend="100% Configured"
        />

        <StatCard
          title="Passes Generated Today"
          value={todayPasses.length}
          subtitle={todayPasses.length > 0 ? 'Active outgoing passes' : 'No passes issued today'}
          icon={Calendar}
          variant="amber"
          trend="Audit Tracked"
        />

        <StatCard
          title="Central Database Engine"
          value="Persistent"
          subtitle="Multi-Device Real-Time Sync"
          icon={ShieldCheck}
          variant="teal"
          trend="Zero-Refresh Live"
        />
      </div>

      {/* Main Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols): Room Selector & Student Fast Picker */}
        <div className="lg:col-span-8 space-y-6">
          <GlassCard className="p-6">
            
            {/* Header with quick filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-emerald-500/20">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <span>Interactive Room-Wise Student Selector</span>
                </h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Click rooms or individual students to add to the gate pass roster.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectFiltered}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 transition-colors font-semibold"
                >
                  Select Filtered ({filteredStudents.length})
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-gray-300 border border-emerald-500/20 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Quick Room Filter Buttons Grid */}
            <div className="py-4 border-b border-emerald-500/10">
              <label className="text-xs font-semibold text-emerald-400/80 block mb-2">
                Fast Room Selection (Click to toggle entire room):
              </label>
              
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                <button
                  onClick={() => setRoomQuery('')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    !roomQuery
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/20'
                  }`}
                >
                  All Rooms
                </button>

                {uniqueRooms.map((room) => {
                  const roomClean = room.replace(/[^0-9]/g, '');
                  const inThisRoom = students.filter((s) => {
                    const sc = s.roomNo.replace(/[^0-9]/g, '');
                    return s.roomNo === room || (roomClean && sc && (sc === roomClean || sc.padStart(2, '0') === roomClean.padStart(2, '0')));
                  });
                  const allSelectedInRoom = inThisRoom.length > 0 && inThisRoom.every((s) => selectedStudentIds.has(s.id));
                  const someSelectedInRoom = inThisRoom.some((s) => selectedStudentIds.has(s.id));
                  const isCurrentFilter = roomQuery === room;

                  return (
                    <div key={room} className="inline-flex rounded-lg shadow-sm">
                      <button
                        onClick={() => setRoomQuery(roomQuery === room ? '' : room)}
                        className={`px-2 py-1 text-xs font-bold rounded-l-lg border-y border-l transition-all ${
                          isCurrentFilter
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : 'bg-emerald-950/50 hover:bg-emerald-900 text-emerald-200 border-emerald-500/25'
                        }`}
                        title={`Filter list to Room ${room}`}
                      >
                        R-{room}
                      </button>

                      <button
                        onClick={() => handleSelectByRoom(room)}
                        className={`px-1.5 py-1 text-xs font-bold rounded-r-lg border transition-all ${
                          allSelectedInRoom
                            ? 'bg-cyan-500 text-black border-cyan-400'
                            : someSelectedInRoom
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                            : 'bg-emerald-950/40 hover:bg-emerald-800/60 text-emerald-400 border-emerald-500/20'
                        }`}
                        title={allSelectedInRoom ? `Deselect all students in Room ${room}` : `Select all ${inThisRoom.length} students in Room ${room}`}
                      >
                        {allSelectedInRoom ? '✓' : `+${inThisRoom.length}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 py-4">
              {/* Name/Phone Search */}
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
                <input
                  type="text"
                  placeholder="Search student name, room (e.g. 10), parent phone, or S.No..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs sm:text-sm text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Year Filter */}
              <div className="sm:col-span-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full py-2 px-2.5 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-200 focus:outline-none focus:border-emerald-400"
                >
                  <option value="ALL">All Years</option>
                  <option value="II">II Year</option>
                  <option value="III">III Year</option>
                </select>
              </div>

              {/* Dept Filter */}
              <div className="sm:col-span-2">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full py-2 px-2.5 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-200 focus:outline-none focus:border-emerald-400"
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

            {/* Students Table / Grid with Checkboxes */}
            <div className="border border-emerald-500/20 rounded-2xl overflow-hidden bg-[#03211b]/80">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-[#063b31] text-emerald-300 uppercase font-bold text-[11px] border-b border-emerald-500/30 z-10">
                    <tr>
                      <th className="py-3 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={
                            filteredStudents.length > 0 &&
                            filteredStudents.every((s) => selectedStudentIds.has(s.id))
                          }
                          onChange={() => {
                            const all = filteredStudents.every((s) => selectedStudentIds.has(s.id));
                            if (all) {
                              setSelectedStudentIds((prev) => {
                                const next = new Set(prev);
                                filteredStudents.forEach((s) => next.delete(s.id));
                                return next;
                              });
                            } else {
                              setSelectedStudentIds((prev) => {
                                const next = new Set(prev);
                                filteredStudents.forEach((s) => next.add(s.id));
                                return next;
                              });
                            }
                          }}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                        />
                      </th>
                      <th className="py-3 px-2 text-center w-12">S.No</th>
                      <th className="py-3 px-2 text-center w-16">Room</th>
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-2 text-center">Dept</th>
                      <th className="py-3 px-2 text-center">Year</th>
                      <th className="py-3 px-3 text-center">Parent Phone</th>
                      <th className="py-3 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400">
                          <AlertCircle className="w-8 h-8 mx-auto text-emerald-400/50 mb-2" />
                          <p className="font-semibold text-emerald-200">No students match current filter</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Try searching for &quot;Room 10&quot; or clearing your search filters.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => {
                        const isSelected = selectedStudentIds.has(student.id);

                        return (
                          <tr
                            key={student.id}
                            onClick={() => toggleStudent(student.id)}
                            className={`cursor-pointer transition-colors duration-150 ${
                              isSelected
                                ? 'bg-emerald-500/20 text-white font-medium'
                                : 'hover:bg-emerald-900/30 text-gray-200'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudent(student.id)}
                                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                              />
                            </td>

                            <td className="py-2.5 px-2 text-center text-gray-400 font-mono text-xs">
                              {student.sNo}
                            </td>

                            <td className="py-2.5 px-2 text-center">
                              <span className="font-bold text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                R-{student.roomNo}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 font-semibold text-white tracking-wide">
                              {student.name}
                            </td>

                            <td className="py-2.5 px-2 text-center">
                              <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded">
                                {student.department}
                              </span>
                            </td>

                            <td className="py-2.5 px-2 text-center">
                              <Badge variant={student.year === 'III' ? 'emerald' : 'cyan'}>
                                {student.year} Year
                              </Badge>
                            </td>

                            <td className="py-2.5 px-3 text-center text-xs text-emerald-200/90 font-mono">
                              {student.parentPhone || '—'}
                            </td>

                            <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => toggleStudent(student.id)}
                                className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${
                                  isSelected
                                    ? 'bg-red-950 hover:bg-red-900 text-red-300'
                                    : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300'
                                }`}
                              >
                                {isSelected ? 'Remove' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="bg-[#021813] px-4 py-2.5 flex items-center justify-between text-xs text-gray-400 border-t border-emerald-500/20">
                <div>
                  Showing <span className="font-bold text-white">{filteredStudents.length}</span> of{' '}
                  <span className="font-bold text-white">{totalStudents}</span> students
                </div>
                <div className="font-semibold text-emerald-400">
                  {selectedStudents.length} Students Selected for Gate Pass
                </div>
              </div>
            </div>

          </GlassCard>
        </div>

        {/* Right Column (4 cols): Gate Pass Customizer & Instant Generator */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-6 sticky top-24">
            
            <div className="pb-4 border-b border-emerald-500/20 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  <span>Gate Pass Parameters</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure official outing timings and leave reasons.
                </p>
              </div>
              <Badge variant="cyan">{selectedStudents.length} Selected</Badge>
            </div>

            <div className="space-y-4 pt-4">
              
              {/* Quick Preset Buttons */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Quick Purpose Presets:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllMembers}
                    className="p-1.5 text-[11px] font-semibold rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-left transition-colors truncate"
                  >
                    🏡 Month-End (All)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurpose('General Evening Outing & Permission');
                      setExpectedInTime('08:30 PM');
                    }}
                    className="p-1.5 text-[11px] font-semibold rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-left transition-colors truncate"
                  >
                    🛍️ Evening Outing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurpose('Academic Project / Symposium');
                      setExpectedInTime('Tomorrow 06:00 PM');
                    }}
                    className="p-1.5 text-[11px] font-semibold rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-left transition-colors truncate"
                  >
                    🎓 Project / College
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurpose('Medical / Emergency Outing');
                      setExpectedInTime('As advised by Doctor');
                    }}
                    className="p-1.5 text-[11px] font-semibold rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-left transition-colors truncate"
                  >
                    🏥 Medical / Clinic
                  </button>
                </div>
              </div>

              {/* Purpose Input */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Purpose of Gate Pass:
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Time Inputs */}
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

              {/* Parent Phone Number Option Checkbox */}
              <div className="pt-1 pb-1">
                <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 cursor-pointer hover:bg-emerald-900/40 transition-colors">
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

              {/* Selected Summary Box */}
              <div className="p-3.5 rounded-xl bg-[#022019] border border-emerald-500/25 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Total Selected:</span>
                  <span className="font-bold text-white text-sm">
                    {selectedStudents.length} Students
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Rooms Involved:</span>
                  <span className="font-semibold text-emerald-300">
                    {Array.from(new Set(selectedStudents.map((s) => s.roomNo))).length} Rooms
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Output Format:</span>
                  <span className="font-semibold text-cyan-300">
                    Official VSB A4 Pass {includeParentPhone ? '(+ Phone)' : ''}
                  </span>
                </div>
              </div>

              {/* Primary Action Button */}
              <GlowingButton
                variant="primary"
                size="lg"
                icon={FileCheck2}
                disabled={selectedStudents.length === 0}
                loading={isGenerating}
                onClick={handleGeneratePass}
                className="w-full shadow-[0_0_25px_rgba(16,185,129,0.5)]"
              >
                GENERATE GATE PASS ({selectedStudents.length})
              </GlowingButton>

              {selectedStudents.length === 0 && (
                <p className="text-[11px] text-amber-300 text-center flex items-center justify-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Select at least 1 student or click &quot;Select All&quot;</span>
                </p>
              )}

            </div>
          </GlassCard>
        </div>

      </div>

      {/* Recent Gate Pass Activity & 1-Click Reuse */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>Recent Gate Pass History</span>
            </h2>
            <p className="text-xs text-gray-400">
              Quickly view, reprint, or reuse previous student selection with 1 click.
            </p>
          </div>

          <Link
            href="/history"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {passes.slice(0, 6).map((pass) => (
            <GlassCard key={pass.id} className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {pass.passNumber}
                  </span>
                  <Badge variant={pass.studentCount > 50 ? 'cyan' : 'emerald'}>
                    {pass.studentCount} Students
                  </Badge>
                </div>

                <h4 className="font-bold text-sm text-white line-clamp-1">
                  {pass.purpose || 'Hostel Gate Pass'}
                </h4>

                <div className="text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span className="text-gray-200 font-medium">
                      {pass.formattedDate || pass.date} • {pass.outTime || '05:30 PM'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rooms:</span>
                    <span className="text-gray-200 font-medium">
                      {pass.roomsIncluded.length > 6
                        ? `All ${pass.roomsIncluded.length} Rooms`
                        : pass.roomsIncluded.map((r) => `R-${r}`).join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-emerald-500/20">
                <button
                  onClick={() => {
                    setActivePreviewPass(pass);
                    setIsModalOpen(true);
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Pass</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleReusePass(pass)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1"
                    title="Load students into current pass generator"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reuse</span>
                  </button>

                  <button
                    onClick={() => downloadGatePassPDF(pass, hostelInfo)}
                    className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-white"
                    title="Download Official PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Official A4 Modal Preview */}
      <GatePassPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pass={activePreviewPass}
        hostelInfo={hostelInfo}
      />

    </div>
  );
}
