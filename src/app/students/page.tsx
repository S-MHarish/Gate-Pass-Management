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
} from 'lucide-react';
import { Student } from '@/types';
import {
  getStudents,
  saveStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  resetMasterDatabase,
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

export default function StudentsDatabasePage() {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

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
    roomNo: '01',
    department: 'CSE',
    year: 'III' as 'I' | 'II' | 'III' | 'IV',
    parentPhone: '',
  });

  // Import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<{ loading: boolean; errors: string[]; successCount: number } | null>(null);

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const refreshList = () => {
    setStudents(getStudents());
  };

  const uniqueRooms = useMemo(() => {
    const set = new Set(students.map((s) => s.roomNo));
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const cleanRoom = roomFilter.replace(/[^0-9]/g, '');
      const matchRoom =
        !cleanRoom ||
        s.roomNo === cleanRoom.padStart(2, '0') ||
        s.roomNo === cleanRoom;

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.parentPhone.includes(q) ||
        s.department.toLowerCase().includes(q) ||
        String(s.sNo) === q;

      const matchYear = yearFilter === 'ALL' || s.year === yearFilter;
      const matchDept = deptFilter === 'ALL' || s.department === deptFilter;

      return matchRoom && matchSearch && matchYear && matchDept;
    });
  }, [students, roomFilter, searchQuery, yearFilter, deptFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      roomNo: '01',
      department: 'CSE',
      year: 'III',
      parentPhone: '',
    });
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
      parentPhone: student.parentPhone,
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');

  // Save New Student
  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter student name');
      return;
    }

    addStudent({
      name: formData.name.trim(),
      roomNo: formData.roomNo.trim() || '1',
      department: formData.department.toUpperCase(),
      year: formData.year,
      parentPhone: formData.parentPhone.trim(),
    });

    setIsAddModalOpen(false);
    refreshList();
  };

  // Save Edited Student
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    updateStudent(selectedStudent.id, {
      name: formData.name.trim(),
      roomNo: formData.roomNo.trim() || '1',
      department: formData.department.toUpperCase(),
      year: formData.year,
      parentPhone: formData.parentPhone.trim(),
    });

    setIsEditModalOpen(false);
    refreshList();
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!selectedStudent) return;
    deleteStudent(selectedStudent.id);
    setIsDeleteModalOpen(false);
    refreshList();
  };

  // Handle Excel/CSV File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true, errors: [], successCount: 0 });

    try {
      const { students: parsed, errors } = await parseStudentsFromExcel(file);
      
      const existing = importMode === 'replace' ? [] : getStudents();
      const newItems: Student[] = parsed.map((p, idx) => ({
        ...p,
        id: 'std-imp-' + Date.now() + '-' + idx,
        sNo: existing.length + idx + 1,
      }));

      saveStudents([...existing, ...newItems]);
      refreshList();
      setImportStatus({
        loading: false,
        errors,
        successCount: newItems.length,
      });
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
          >
            Add Student
          </GlowingButton>

          <GlowingButton
            variant="secondary"
            icon={Upload}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import Excel
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
                const count = students.filter((s) => s.roomNo === r).length;
                const isSelected = roomFilter === r || roomFilter === `Room ${r}`;

                return (
                  <button
                    key={r}
                    onClick={() => setRoomFilter(roomFilter === r ? '' : r)}
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
                placeholder="Search Room (e.g. 10)"
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="sm:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <input
                type="text"
                placeholder="Search Student Name / Phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="sm:col-span-2">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full py-2 px-2.5 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-200 focus:outline-none"
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
                className="w-full py-2 px-2.5 bg-[#021d17] border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-200 focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="AI&DS">AI&DS</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
              </select>
            </div>
          </div>

        </div>

        {/* Database Records Table */}
        <div className="border border-emerald-500/20 rounded-2xl overflow-hidden bg-[#03211b]/90 mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#063b31] text-emerald-300 uppercase font-bold text-[11px] border-b border-emerald-500/30">
                <tr>
                  <th className="py-3 px-3 text-center w-16">S.No</th>
                  <th className="py-3 px-3 text-center w-20">Room</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-3 text-center">Department</th>
                  <th className="py-3 px-3 text-center">Year</th>
                  <th className="py-3 px-4 text-center">Parent Phone No.</th>
                  <th className="py-3 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      <p className="font-semibold text-emerald-200">No students match current search query</p>
                      <p className="text-xs text-gray-500 mt-1">Try resetting search filters or adding a student.</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => (
                    <tr
                      key={student.id}
                      className="hover:bg-emerald-900/30 transition-colors duration-150"
                    >
                      <td className="py-3 px-3 text-center font-mono text-gray-400 font-semibold">
                        {student.sNo || idx + 1}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                          {student.roomNo}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white uppercase tracking-wide">
                        {student.name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-xs font-semibold">
                          {student.department}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-xs font-semibold text-gray-300">
                        {student.year}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-emerald-300 font-medium">
                        {student.parentPhone}
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

      {/* Modal: Add Student */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student to Master Database"
        subtitle="Record will be permanently saved for future gate passes"
      >
        <form onSubmit={handleSaveNew} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Student Full Name:
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sivasradeep.S"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Room Number:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 10"
                value={formData.roomNo}
                onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Department:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CSE, IT, AI&DS"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Year of Study:
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value as any })}
                className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="II">II Year</option>
                <option value="III">III Year</option>
                <option value="IV">IV Year</option>
                <option value="I">I Year</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Parent Phone Number:
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9842145678"
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-mono"
              />
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
            <GlowingButton variant="primary" size="md" type="submit">
              Save Student Record
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
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Student Full Name:
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Room Number:
              </label>
              <input
                type="text"
                required
                value={formData.roomNo}
                onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Department:
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Year:
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value as any })}
                className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="II">II Year</option>
                <option value="III">III Year</option>
                <option value="IV">IV Year</option>
                <option value="I">I Year</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Parent Phone:
              </label>
              <input
                type="tel"
                required
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 font-mono"
              />
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
            <GlowingButton variant="primary" size="md" type="submit">
              Update Student Record
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
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-emerald-500 focus:ring-emerald-400"
              />
              <span>Replace Database ({students.length} existing)</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-emerald-200">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="text-emerald-500 focus:ring-emerald-400"
              />
              <span>Append Records</span>
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
                : 'Will append new students to current database.'}
            </p>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-[#042820] border border-emerald-500/30 text-xs">
              {importStatus.loading ? (
                <p className="text-emerald-300 animate-pulse">Parsing and importing file...</p>
              ) : importStatus.errors.length > 0 ? (
                <div className="space-y-1 text-red-300">
                  <p className="font-bold">Errors encountered:</p>
                  {importStatus.errors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
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
