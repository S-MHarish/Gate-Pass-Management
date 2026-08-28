'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import {
  getStudents,
  saveStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  resetMasterDatabase,
  isStudentDuplicate,
  compareRoomNumbers,
} from '@/lib/storage';
import {
  exportStudentsToExcel,
  exportStudentsToCSV,
  downloadSampleExcelTemplate,
  parseStudentsFromExcel,
} from '@/lib/excelUtils';
import { INITIAL_STUDENTS } from '@/lib/seedData';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

const COMMON_DEPTS = ['CSE', 'IT', 'AI&DS', 'AIML', 'CSBS', 'ECE', 'EEE', 'MECH', 'CIVIL'];

export default function StudentsDatabasePage() {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
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

  // Import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<{ loading: boolean; errors: string[]; successCount: number } | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const refreshList = () => {
    setStudents(getStudents());
  };

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

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    const trimmedName = formData.name.trim();
    const trimmedRoom = formData.roomNo.trim();
    const trimmedDept = formData.department.trim();
    const trimmedPhone = formData.parentPhone.trim().replace(/[^0-9]/g, '');

    if (!trimmedName) {
      errors.name = 'Student name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Student name must be at least 2 characters';
    }

    if (!trimmedRoom) {
      errors.roomNo = 'Room number is required';
    }

    if (!trimmedDept) {
      errors.department = 'Department is required';
    }

    if (!formData.parentPhone.trim()) {
      errors.parentPhone = 'Parent phone number is required';
    } else if (trimmedPhone.length < 10) {
      errors.parentPhone = 'Please enter a valid 10-digit parent phone number (e.g. 9876543210)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save New Student
  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const trimmedName = formData.name.trim();
    const trimmedRoom = formData.roomNo.trim();
    const trimmedDept = formData.department.trim().toUpperCase();
    const cleanPhone = formData.parentPhone.trim().replace(/[^0-9]/g, '');

    const result = addStudent({
      name: trimmedName,
      roomNo: trimmedRoom,
      department: trimmedDept,
      year: formData.year,
      parentPhone: cleanPhone || formData.parentPhone.trim(),
    });

    if (!result.success) {
      setFormErrors((prev) => ({
        ...prev,
        duplicate: result.error || 'Student already exists.',
      }));
      return;
    }

    setIsAddModalOpen(false);
    refreshList();
    showNotification(`✓ Student added successfully: ${trimmedName} (Room ${trimmedRoom})`);
  };

  // Save Edited Student
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!validateForm()) return;

    const trimmedName = formData.name.trim();
    const trimmedRoom = formData.roomNo.trim();
    const trimmedDept = formData.department.trim().toUpperCase();
    const cleanPhone = formData.parentPhone.trim().replace(/[^0-9]/g, '');

    const result = updateStudent(selectedStudent.id, {
      name: trimmedName,
      roomNo: trimmedRoom,
      department: trimmedDept,
      year: formData.year,
      parentPhone: cleanPhone || formData.parentPhone.trim(),
    });

    if (!result.success) {
      setFormErrors((prev) => ({
        ...prev,
        duplicate: result.error || 'Student already exists.',
      }));
      return;
    }

    setIsEditModalOpen(false);
    refreshList();
    showNotification(`✓ Student updated successfully: ${trimmedName}`);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!selectedStudent) return;
    const name = selectedStudent.name;
    deleteStudent(selectedStudent.id);
    setIsDeleteModalOpen(false);
    refreshList();
    showNotification(`Student ${name} removed from master database.`);
  };

  // Handle Excel/CSV File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true, errors: [], successCount: 0 });

    try {
      const { students: parsed, errors } = await parseStudentsFromExcel(file);
      const existing = importMode === 'replace' ? [] : getStudents();

      // Prevent duplicates in append mode
      const toAdd: Student[] = [];
      let skippedCount = 0;

      parsed.forEach((p, idx) => {
        if (importMode === 'append' && isStudentDuplicate([...existing, ...toAdd], p)) {
          skippedCount++;
          return;
        }

        toAdd.push({
          ...p,
          id: `std-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          sNo: existing.length + toAdd.length + 1,
          isActive: true,
        });
      });

      const updatedDatabase = [...existing, ...toAdd];
      saveStudents(updatedDatabase);
      refreshList();

      const errorList = [...errors];
      if (skippedCount > 0) {
        errorList.push(`Skipped ${skippedCount} duplicate student(s) already in the database.`);
      }

      setImportStatus({
        loading: false,
        errors: errorList,
        successCount: toAdd.length,
      });

      if (toAdd.length > 0) {
        showNotification(`✓ Successfully imported ${toAdd.length} students!`);
      }
    } catch (err: any) {
      setImportStatus({
        loading: false,
        errors: [`Failed to parse file: ${err?.message || 'Unknown error'}`],
        successCount: 0,
      });
    }
  };

  return (
    <div className="space-y-8 pb-12">

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 animate-scaleUp max-w-md bg-emerald-950/95 border-2 border-emerald-400 text-white px-5 py-4 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.4)] backdrop-blur-xl flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-emerald-100">{successToast}</p>
            <p className="text-xs text-emerald-300/80">Master student database updated permanently.</p>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="ml-auto text-emerald-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hostel Master Student Database
            </h1>
            <Badge variant="emerald">{students.length} Permanent Members</Badge>
          </div>
          <p className="text-sm text-emerald-300/80 mt-1">
            Permanent registry of all boys hostel members. Stored records remain permanent across all pass generations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <GlowingButton
            variant="primary"
            icon={UserPlus}
            onClick={handleOpenAdd}
            className="shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_28px_rgba(16,185,129,0.6)]"
          >
            + Add New Student
          </GlowingButton>

          <GlowingButton
            variant="secondary"
            icon={Upload}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import Excel / CSV
          </GlowingButton>

          <GlowingButton
            variant="secondary"
            icon={Download}
            onClick={() => exportStudentsToCSV(students)}
          >
            Export CSV
          </GlowingButton>

          <GlowingButton
            variant="secondary"
            icon={Download}
            onClick={() => exportStudentsToExcel(students)}
          >
            Export Excel
          </GlowingButton>
        </div>
      </div>

      {/* Main Database Table Container */}
      <GlassCard className="p-6">
        
        {/* Search & Filter Toolbar */}
        <div className="space-y-4 pb-6 border-b border-emerald-500/20">
          
          {/* Room quick pills */}
          <div>
            <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-2">
              Filter by Room Number:
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              <button
                onClick={() => setRoomFilter('')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  roomFilter === ''
                    ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/20'
                }`}
              >
                All Rooms ({students.length})
              </button>

              {uniqueRooms.map((r) => {
                const count = students.filter(
                  (s) => s.roomNo === r || s.roomNo.replace(/^0+/, '') === r.replace(/^0+/, '')
                ).length;
                const isSelected =
                  roomFilter === r ||
                  roomFilter === `Room ${r}` ||
                  roomFilter === `R-${r}` ||
                  (roomFilter !== '' && roomFilter.replace(/[^0-9]/g, '') === r.replace(/[^0-9]/g, ''));

                return (
                  <button
                    key={r}
                    onClick={() => setRoomFilter(isSelected ? '' : r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                        : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300/90 border border-emerald-500/20'
                    }`}
                  >
                    R-{r} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4 relative">
              <Building className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <input
                type="text"
                placeholder="Search Room (e.g. 1 or Room 1)"
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-gray-500"
              />
            </div>

            <div className="sm:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <input
                type="text"
                placeholder="Search Student Name / Phone (e.g. Krish)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all placeholder:text-gray-500"
              />
            </div>

            <div className="sm:col-span-2">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full py-2.5 px-3 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-200 focus:outline-none focus:border-emerald-400"
              >
                <option value="ALL">All Years</option>
                <option value="I">I Year</option>
                <option value="II">II Year</option>
                <option value="III">III Year</option>
                <option value="IV">IV Year</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full py-2.5 px-3 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-200 focus:outline-none focus:border-emerald-400"
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

        {/* Database Records Table */}
        <div className="border border-emerald-500/20 rounded-2xl overflow-hidden bg-[#03211b]/90 mt-6 shadow-inner">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#063b31] text-emerald-300 uppercase font-bold text-[11px] border-b border-emerald-500/30">
                <tr>
                  <th className="py-3.5 px-3 text-center w-16">S.No</th>
                  <th className="py-3.5 px-3 text-center w-20">Room</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-3 text-center">Department</th>
                  <th className="py-3.5 px-3 text-center">Year</th>
                  <th className="py-3.5 px-4 text-center">Parent Phone No.</th>
                  <th className="py-3.5 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <p className="font-semibold text-emerald-200 text-base">No students match current search query</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        Try resetting your search filters or click below to add a student.
                      </p>
                      <div className="mt-4">
                        <GlowingButton variant="primary" size="sm" icon={UserPlus} onClick={handleOpenAdd}>
                          + Add New Student
                        </GlowingButton>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => (
                    <tr
                      key={student.id}
                      className="hover:bg-emerald-900/30 transition-colors duration-150 group"
                    >
                      <td className="py-3 px-3 text-center font-mono text-emerald-300/80 font-bold">
                        {student.sNo || idx + 1}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-xs group-hover:border-emerald-400 transition-colors">
                          {student.roomNo}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white tracking-wide">
                        {student.name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-xs font-semibold border border-emerald-500/20">
                          {student.department}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-xs font-semibold text-gray-300">
                        {student.year} Year
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-emerald-300 font-medium">
                        {student.parentPhone || <span className="text-gray-500 italic">Not Provided</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/30 transition-colors"
                            title="Edit Student"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(student)}
                            className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/30 transition-colors"
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

          {/* Table Footer Status */}
          <div className="p-4 bg-[#042820] border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-300 gap-2">
            <span>
              Showing {filteredStudents.length} of {students.length} Registered Students
            </span>
            <span className="text-gray-400">
              VSB Engineering College • Boys Hostel-I Master Database
            </span>
          </div>
        </div>

      </GlassCard>

      {/* Modal: + Add New Student */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="+ Add New Student"
        subtitle="Add a student record permanently to the master hostel database"
      >
        <form onSubmit={handleSaveNew} className="space-y-4">
          
          {/* Duplicate Error Banner */}
          {formErrors.duplicate && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 flex items-start space-x-2.5 text-red-200 text-xs animate-scaleUp">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-100">{formErrors.duplicate}</p>
                <p className="text-[11px] text-red-300/90 mt-0.5">
                  A student with the same name or details already exists in this hostel database.
                </p>
              </div>
            </div>
          )}

          {/* Student Name */}
          <div>
            <label className="text-xs font-bold text-emerald-200 block mb-1">
              Student Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Krish"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name || formErrors.duplicate) {
                  setFormErrors({ ...formErrors, name: undefined, duplicate: undefined });
                }
              }}
              className={`w-full px-3.5 py-2.5 bg-[#021d17] border rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none transition-colors ${
                formErrors.name ? 'border-red-500 focus:border-red-400' : 'border-emerald-500/40 focus:border-emerald-400'
              }`}
            />
            {formErrors.name && (
              <p className="text-[11px] text-red-400 mt-1">{formErrors.name}</p>
            )}
          </div>

          {/* Room Number and Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-emerald-200 block mb-1">
                Room Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 1"
                value={formData.roomNo}
                onChange={(e) => {
                  setFormData({ ...formData, roomNo: e.target.value });
                  if (formErrors.roomNo || formErrors.duplicate) {
                    setFormErrors({ ...formErrors, roomNo: undefined, duplicate: undefined });
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-[#021d17] border rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none transition-colors ${
                  formErrors.roomNo ? 'border-red-500 focus:border-red-400' : 'border-emerald-500/40 focus:border-emerald-400'
                }`}
              />
              {formErrors.roomNo && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.roomNo}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-200 block mb-1">
                Department <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CSE"
                value={formData.department}
                onChange={(e) => {
                  setFormData({ ...formData, department: e.target.value });
                  if (formErrors.department) {
                    setFormErrors({ ...formErrors, department: undefined });
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-[#021d17] border rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none transition-colors ${
                  formErrors.department ? 'border-red-500 focus:border-red-400' : 'border-emerald-500/40 focus:border-emerald-400'
                }`}
              />
              {/* Quick Dept suggestions */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_DEPTS.slice(0, 5).map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setFormData({ ...formData, department: d })}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/20"
                  >
                    {d}
                  </button>
                ))}
              </div>
              {formErrors.department && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.department}</p>
              )}
            </div>
          </div>

          {/* Year and Parent Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-emerald-200 block mb-1">
                Year <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="III">III Year</option>
                <option value="II">II Year</option>
                <option value="I">I Year</option>
                <option value="IV">IV Year</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-200 block mb-1">
                Parent Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={formData.parentPhone}
                onChange={(e) => {
                  setFormData({ ...formData, parentPhone: e.target.value });
                  if (formErrors.parentPhone || formErrors.duplicate) {
                    setFormErrors({ ...formErrors, parentPhone: undefined, duplicate: undefined });
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-[#021d17] border rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none font-mono transition-colors ${
                  formErrors.parentPhone ? 'border-red-500 focus:border-red-400' : 'border-emerald-500/40 focus:border-emerald-400'
                }`}
              />
              {formErrors.parentPhone && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.parentPhone}</p>
              )}
            </div>
          </div>

          {/* Automatic S.No Notice */}
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center space-x-2 text-xs text-emerald-300/90">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              S.No will be automatically calculated and permanently assigned by the system.
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/20 transition-all"
            >
              Cancel
            </button>
            <GlowingButton variant="primary" size="md" type="submit">
              Add Student
            </GlowingButton>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Student */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Information"
        subtitle={`Updating student: ${selectedStudent?.name}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          
          {formErrors.duplicate && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 flex items-start space-x-2.5 text-red-200 text-xs animate-scaleUp">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-100">{formErrors.duplicate}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-emerald-200 block mb-1">
              Student Full Name:
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-emerald-200 block mb-1">
                Room Number:
              </label>
              <input
                type="text"
                required
                value={formData.roomNo}
                onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-emerald-200 block mb-1">
                Department:
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-emerald-200 block mb-1">
                Year:
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="III">III Year</option>
                <option value="II">II Year</option>
                <option value="I">I Year</option>
                <option value="IV">IV Year</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-emerald-200 block mb-1">
                Parent Phone:
              </label>
              <input
                type="tel"
                required
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <GlowingButton variant="primary" size="md" type="submit">
              Update Student
            </GlowingButton>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Student Deletion"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-3 text-red-200 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">
                Are you sure you want to remove {selectedStudent?.name}?
              </p>
              <p className="text-xs text-red-300 mt-1">
                Room {selectedStudent?.roomNo} • {selectedStudent?.department} • Parent: {selectedStudent?.parentPhone}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <GlowingButton
              variant="danger"
              size="md"
              onClick={handleConfirmDelete}
            >
              Delete Student
            </GlowingButton>
          </div>
        </div>
      </Modal>

      {/* Modal: Excel Bulk Import */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportStatus(null);
        }}
        title="Import Students from Excel / CSV"
        subtitle="Upload your hostel student roster in .xlsx or .csv format"
      >
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 space-y-2 text-xs text-emerald-200">
            <p className="font-bold text-white flex items-center space-x-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Supported Columns:</span>
            </p>
            <p>
              Room No, Student Name, Department, Year (II/III), Parent Phone Number
            </p>
            <button
              onClick={downloadSampleExcelTemplate}
              className="mt-2 text-cyan-300 hover:underline font-bold flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV / Excel Template</span>
            </button>
          </div>

          {/* Import Mode Selector */}
          <div className="flex items-center space-x-4 p-3 rounded-xl bg-[#03221c] border border-emerald-500/20 text-xs">
            <span className="font-bold text-gray-300">Import Mode:</span>
            <label className="flex items-center space-x-1.5 cursor-pointer text-emerald-200">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="text-emerald-500 focus:ring-emerald-400"
              />
              <span>Append Records (Skip Duplicates)</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-emerald-200">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-emerald-500 focus:ring-emerald-400"
              />
              <span>Replace Database ({students.length} existing)</span>
            </label>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 p-8 rounded-2xl text-center cursor-pointer bg-[#021d17] transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <Upload className="w-10 h-10 mx-auto text-emerald-400 group-hover:scale-110 transition-transform duration-300 mb-2" />
            <p className="text-sm font-bold text-white">
              Click to select CSV (e.g. hostel_members_97.csv) or Excel file
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {importMode === 'replace'
                ? 'Will replace current database with imported students.'
                : 'Will append new students to current database without creating duplicates.'}
            </p>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-[#042820] border border-emerald-500/30 text-xs">
              {importStatus.loading ? (
                <p className="text-emerald-300 animate-pulse">Parsing and importing file...</p>
              ) : importStatus.errors.length > 0 ? (
                <div className="space-y-1 text-red-300">
                  <p className="font-bold">Errors / Notices:</p>
                  {importStatus.errors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                  {importStatus.successCount > 0 && (
                    <p className="text-emerald-300 font-bold mt-2">
                      Successfully imported {importStatus.successCount} new students!
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-emerald-300 font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Successfully imported {importStatus.successCount} students!</span>
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setIsImportModalOpen(false);
                setImportStatus(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
