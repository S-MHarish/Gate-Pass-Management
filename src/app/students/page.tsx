'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Edit2,
  Trash2,
  Building,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter,
  X,
  Phone,
  BookOpen,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Student } from '@/types';
import { useRealtime } from '@/context/RealtimeContext';
import { compareRoomNumbers } from '@/lib/roomUtils';
import {
  exportStudentsToExcel,
  exportStudentsToCSV,
  downloadSampleExcelTemplate,
  parseStudentsFromExcel,
} from '@/lib/excelUtils';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

const COMMON_DEPTS = ['CSE', 'IT', 'AI&DS', 'AIML', 'CSBS', 'ECE', 'EEE', 'MECH', 'CIVIL'];

export default function StudentsDatabasePage() {
  const {
    students,
    addStudent: apiAddStudent,
    updateStudent: apiUpdateStudent,
    deleteStudent: apiDeleteStudent,
    bulkImportStudents: apiBulkImport,
    resetMasterDatabase: apiResetDatabase,
  } = useRealtime();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Success Toast state
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Active student for edit/delete
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    roomNo: '1',
    department: 'CSE',
    year: 'III' as 'I' | 'II' | 'III' | 'IV',
    parentPhone: '',
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    roomNo?: string;
    department?: string;
    parentPhone?: string;
    duplicate?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<{ loading: boolean; errors: string[]; successCount: number } | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const showNotification = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  const uniqueRooms = useMemo(() => {
    const set = new Set(students.map((s) => s.roomNo));
    return Array.from(set).sort(compareRoomNumbers);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const cleanRoom = roomFilter.replace(/[^0-9]/g, '');
      const studentClean = s.roomNo.replace(/[^0-9]/g, '');
      const matchRoom =
        !roomFilter ||
        (cleanRoom && studentClean && (studentClean === cleanRoom || studentClean.padStart(2, '0') === cleanRoom.padStart(2, '0'))) ||
        s.roomNo.toLowerCase() === roomFilter.toLowerCase();

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

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      roomNo: '1',
      department: 'CSE',
      year: 'III',
      parentPhone: '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      roomNo: student.roomNo,
      department: student.department,
      year: student.year,
      parentPhone: student.parentPhone || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const errors: typeof formErrors = {};
    if (!formData.name.trim()) {
      errors.name = 'Student Name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!formData.roomNo.trim()) {
      errors.roomNo = 'Room Number is required.';
    }

    if (!formData.department.trim()) {
      errors.department = 'Department is required.';
    }

    if (formData.parentPhone && formData.parentPhone.replace(/\D/g, '').length > 0) {
      const cleanPhone = formData.parentPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        errors.parentPhone = 'Parent phone should be 10 digits.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save New Student
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const result = await apiAddStudent({
      name: formData.name.trim().toUpperCase(),
      roomNo: formData.roomNo.trim(),
      department: formData.department.trim().toUpperCase(),
      year: formData.year,
      parentPhone: formData.parentPhone.trim(),
      isActive: true,
    });
    setIsSubmitting(false);

    if (result.success && result.student) {
      setIsAddModalOpen(false);
      showNotification(`✓ Student "${result.student.name}" saved to Room ${result.student.roomNo} in central database!`);
    } else {
      setFormErrors((prev) => ({
        ...prev,
        duplicate: result.error || 'Failed to add student.',
      }));
    }
  };

  // Save Edit Student
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !validateForm()) return;

    setIsSubmitting(true);
    const result = await apiUpdateStudent(selectedStudent.id, {
      name: formData.name.trim().toUpperCase(),
      roomNo: formData.roomNo.trim(),
      department: formData.department.trim().toUpperCase(),
      year: formData.year,
      parentPhone: formData.parentPhone.trim(),
    });
    setIsSubmitting(false);

    if (result.success) {
      setIsEditModalOpen(false);
      showNotification(`✓ Details updated for ${formData.name.toUpperCase()} (Room ${formData.roomNo}) across all devices!`);
    } else {
      setFormErrors((prev) => ({
        ...prev,
        duplicate: result.error || 'Failed to update student.',
      }));
    }
  };

  // Delete Student
  const handleConfirmDelete = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    const result = await apiDeleteStudent(selectedStudent.id);
    setIsSubmitting(false);

    if (result.success) {
      setIsDeleteModalOpen(false);
      showNotification(`✓ Student "${selectedStudent.name}" removed from Room ${selectedStudent.roomNo}.`);
      setSelectedStudent(null);
    } else {
      alert(result.error || 'Failed to delete student.');
    }
  };

  // Reset to Factory Default
  const handleResetToDefault = async () => {
    setIsSubmitting(true);
    const result = await apiResetDatabase();
    setIsSubmitting(false);

    if (result.success) {
      setIsResetModalOpen(false);
      showNotification('✓ Master student registry reset to default 97 students for VSB Boys Hostel-I.');
    } else {
      alert(result.error || 'Failed to reset master database.');
    }
  };

  // Import File Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true, errors: [], successCount: 0 });

    try {
      const parsed = await parseStudentsFromExcel(file);
      if (parsed.students.length === 0) {
        setImportStatus({
          loading: false,
          errors: ['No valid student records found in file.'],
          successCount: 0,
        });
        return;
      }

      const res = await apiBulkImport(parsed.students, importMode);
      if (res.success) {
        setImportStatus({
          loading: false,
          errors: parsed.errors,
          successCount: res.count || parsed.students.length,
        });
        showNotification(`✓ Successfully imported ${res.count || parsed.students.length} students into central database!`);
      } else {
        setImportStatus({
          loading: false,
          errors: [res.error || 'Failed to import into database.'],
          successCount: 0,
        });
      }
    } catch (err: any) {
      setImportStatus({
        loading: false,
        errors: [err.message || 'Error processing spreadsheet file.'],
        successCount: 0,
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-emerald-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span className="text-sm font-bold">{successToast}</span>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-200 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hostel Master Student Database
            </h1>
            <Badge variant="emerald">{students.length} Students</Badge>
          </div>
          <p className="text-sm text-emerald-300/80 mt-1">
            Central persistent registry of all Boys Hostel-I members (Rooms 01–22). Auto-synchronized across all devices.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <GlowingButton variant="primary" icon={UserPlus} onClick={handleOpenAdd}>
            + Add New Student
          </GlowingButton>

          <GlowingButton variant="accent" icon={Upload} onClick={() => setIsImportModalOpen(true)}>
            Import Excel/CSV
          </GlowingButton>

          <button
            onClick={() => exportStudentsToExcel(students)}
            className="px-3 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            title="Download full database as Excel .xlsx"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => exportStudentsToCSV(students)}
            className="px-3 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            title="Download CSV for spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Database Table Container */}
      <GlassCard className="p-6">
        
        {/* Filter Toolbar */}
        <div className="space-y-4 pb-6 border-b border-emerald-500/20">
          
          {/* Quick Room filter chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400">
                Filter by Room ({uniqueRooms.length} Rooms Active):
              </span>
              {roomFilter && (
                <button
                  onClick={() => setRoomFilter('')}
                  className="text-xs text-cyan-300 hover:underline flex items-center space-x-1 font-semibold"
                >
                  <span>Clear Room Filter (Show All)</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              <button
                onClick={() => setRoomFilter('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  !roomFilter
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/20'
                }`}
              >
                All Rooms ({students.length})
              </button>

              {uniqueRooms.map((room) => {
                const roomClean = room.replace(/[^0-9]/g, '');
                const count = students.filter((s) => {
                  const sc = s.roomNo.replace(/[^0-9]/g, '');
                  return s.roomNo === room || (roomClean && sc && (sc === roomClean || sc.padStart(2, '0') === roomClean.padStart(2, '0')));
                }).length;
                const isSelected = roomFilter === room;

                return (
                  <button
                    key={room}
                    onClick={() => setRoomFilter(isSelected ? '' : room)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'bg-emerald-950/50 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/25'
                    }`}
                  >
                    Room {room} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search, Dept & Year select */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <input
                type="text"
                placeholder="Search student name, room (e.g. 10), parent phone, or S.No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs sm:text-sm text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full py-2 px-3 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-200 focus:outline-none focus:border-emerald-400"
              >
                <option value="ALL">All Academic Years</option>
                <option value="II">II Year</option>
                <option value="III">III Year</option>
                <option value="IV">IV Year</option>
                <option value="I">I Year</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full py-2 px-3 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-200 focus:outline-none focus:border-emerald-400"
              >
                <option value="ALL">All Departments</option>
                {COMMON_DEPTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Database Table (Always sorted Room-wise numerically with S.No) */}
        <div className="mt-6 border border-emerald-500/20 rounded-2xl overflow-hidden bg-[#03211b]/90 shadow-xl">
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="sticky top-0 bg-[#053229] text-emerald-300 uppercase font-bold text-[11px] border-b border-emerald-500/30 z-10">
                <tr>
                  <th className="py-3.5 px-3 text-center w-14">S.No</th>
                  <th className="py-3.5 px-3 text-center w-24">Room No</th>
                  <th className="py-3.5 px-4 font-bold">Student Name</th>
                  <th className="py-3.5 px-3 text-center">Department</th>
                  <th className="py-3.5 px-3 text-center">Year</th>
                  <th className="py-3.5 px-4 text-center">Parent Phone Number</th>
                  <th className="py-3.5 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <Users className="w-10 h-10 mx-auto text-emerald-500/40 mb-2" />
                      <p className="font-bold text-white text-base">No students found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Try adjusting your search criteria or add a new student.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-emerald-900/30 transition-colors group text-gray-200"
                    >
                      <td className="py-3 px-3 text-center font-mono text-gray-400 font-bold">
                        {student.sNo}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-extrabold text-xs bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/40 shadow-sm">
                          Room {student.roomNo}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-white tracking-wide text-sm">
                        {student.name}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
                          {student.department}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <Badge variant={student.year === 'III' ? 'emerald' : 'cyan'}>
                          {student.year} Year
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-xs text-emerald-300">
                        {student.parentPhone || '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-emerald-300 hover:text-white transition-colors"
                            title="Edit Student"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenDelete(student)}
                            className="p-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-red-100 transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Stats */}
          <div className="bg-[#021813] px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 border-t border-emerald-500/20 gap-2">
            <div>
              Showing <span className="font-bold text-white">{filteredStudents.length}</span> of{' '}
              <span className="font-bold text-white">{students.length}</span> students across{' '}
              <span className="font-bold text-emerald-400">{uniqueRooms.length}</span> rooms.
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="text-xs text-red-400/80 hover:text-red-300 flex items-center space-x-1"
                title="Reset database to default 97 students"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Factory 97 Students</span>
              </button>
            </div>
          </div>
        </div>

      </GlassCard>

      {/* ADD STUDENT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student to Master Registry"
        subtitle="S.No is automatically calculated and the student is grouped inside their room number."
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          
          {formErrors.duplicate && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{formErrors.duplicate}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Student Name (Full Name): *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PARANIDARAN K"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 uppercase font-semibold"
            />
            {formErrors.name && (
              <p className="text-[11px] text-red-400 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Room Number: *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 8 or 10"
                value={formData.roomNo}
                onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-bold"
              />
              {formErrors.roomNo && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.roomNo}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Academic Year: *
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-semibold"
              >
                <option value="III">III Year</option>
                <option value="II">II Year</option>
                <option value="IV">IV Year</option>
                <option value="I">I Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Department: *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CSE, IT, ECE"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-semibold uppercase"
              />
              {formErrors.department && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.department}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Parent Phone Number:
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-mono"
              />
              {formErrors.parentPhone && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.parentPhone}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <GlowingButton variant="primary" size="md" type="submit" loading={isSubmitting}>
              Save Student to Central Database
            </GlowingButton>
          </div>
        </form>
      </Modal>

      {/* EDIT STUDENT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Details"
        subtitle={`Updating student in Room ${formData.roomNo}. All changes are broadcast live.`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          
          {formErrors.duplicate && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{formErrors.duplicate}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Student Name: *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 uppercase font-semibold"
            />
            {formErrors.name && (
              <p className="text-[11px] text-red-400 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Room Number: *
              </label>
              <input
                type="text"
                required
                value={formData.roomNo}
                onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-bold"
              />
              {formErrors.roomNo && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.roomNo}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Academic Year: *
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-semibold"
              >
                <option value="III">III Year</option>
                <option value="II">II Year</option>
                <option value="IV">IV Year</option>
                <option value="I">I Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Department: *
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-semibold uppercase"
              />
              {formErrors.department && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.department}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Parent Phone Number:
              </label>
              <input
                type="tel"
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                className="w-full px-3 py-2 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-mono"
              />
              {formErrors.parentPhone && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.parentPhone}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <GlowingButton variant="primary" size="md" type="submit" loading={isSubmitting}>
              Update &amp; Sync to All Devices
            </GlowingButton>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Student Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete student{' '}
            <span className="font-bold text-white">{selectedStudent?.name}</span> from{' '}
            <span className="font-bold text-white">Room {selectedStudent?.roomNo}</span>?
          </p>

          <p className="text-xs text-amber-300">
            This will update the central database and remove the student from all connected devices immediately.
          </p>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <GlowingButton
              variant="danger"
              size="md"
              loading={isSubmitting}
              onClick={handleConfirmDelete}
            >
              Delete Student
            </GlowingButton>
          </div>
        </div>
      </Modal>

      {/* RESET TO FACTORY DEFAULT MODAL */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Master Database to Default?"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-sm">Warning: Reset Master Registry</p>
              <p className="text-xs text-red-300 mt-1">
                This will overwrite the central database with the official roster of 97 students for VSB Boys Hostel-I (Rooms 01–22) and broadcast the update to all devices.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-emerald-500/20">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <GlowingButton variant="danger" size="md" loading={isSubmitting} onClick={handleResetToDefault}>
              Confirm Reset
            </GlowingButton>
          </div>
        </div>
      </Modal>

      {/* IMPORT EXCEL/CSV MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Students from Excel or CSV"
        subtitle="Upload your roster spreadsheet with columns: Room No, Name, Department, Year, Parent Phone."
      >
        <div className="space-y-5">
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs">
            <span className="text-emerald-200">Need a sample format template?</span>
            <button
              onClick={downloadSampleExcelTemplate}
              className="text-cyan-300 hover:text-cyan-200 font-bold underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">
              Import Mode:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                importMode === 'append' ? 'bg-emerald-950 border-emerald-400 text-white' : 'bg-[#021d17] border-emerald-500/20 text-gray-400'
              }`}>
                <input
                  type="radio"
                  name="mode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="hidden"
                />
                <span className="font-bold block text-emerald-300">Append New</span>
                <span className="text-[11px] text-gray-400">Add new students without overwriting existing</span>
              </label>

              <label className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                importMode === 'replace' ? 'bg-emerald-950 border-emerald-400 text-white' : 'bg-[#021d17] border-emerald-500/20 text-gray-400'
              }`}>
                <input
                  type="radio"
                  name="mode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="hidden"
                />
                <span className="font-bold block text-cyan-300">Replace All</span>
                <span className="text-[11px] text-gray-400">Replace entire central student roster</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">
              Select Excel (.xlsx) or CSV (.csv) file:
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="w-full text-xs text-emerald-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer bg-[#021d17] border border-emerald-500/30 rounded-xl p-2"
            />
          </div>

          {importStatus && (
            <div className="p-3.5 rounded-xl bg-[#022019] border border-emerald-500/30 text-xs space-y-2">
              {importStatus.loading && <p className="text-cyan-300 font-semibold">Processing spreadsheet...</p>}
              {importStatus.successCount > 0 && (
                <p className="text-emerald-300 font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Successfully processed {importStatus.successCount} student records!</span>
                </p>
              )}
              {importStatus.errors.length > 0 && (
                <div className="text-amber-300 space-y-1">
                  <p className="font-semibold">Notes / Skipped rows:</p>
                  <ul className="list-disc list-inside text-[11px] text-gray-400 max-h-24 overflow-y-auto">
                    {importStatus.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-emerald-500/20">
            <GlowingButton variant="primary" size="md" onClick={() => setIsImportModalOpen(false)}>
              Done
            </GlowingButton>
          </div>
        </div>
      </Modal>

    </div>
  );
}
