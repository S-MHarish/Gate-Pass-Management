import { Student, GatePass, HostelInfo, FilterOptions } from '@/types';
import { INITIAL_STUDENTS, DEFAULT_HOSTEL_INFO } from './seedData';

const STUDENTS_KEY = 'vsb_hostel_master_students_v2';
const PASSES_KEY = 'vsb_hostel_gate_passes_v2';
const HOSTEL_INFO_KEY = 'vsb_hostel_info_v2';
const AUTH_KEY = 'vsb_hostel_admin_auth_v2';

// Initial Sample Passes for realistic initial load
const SAMPLE_HISTORIC_PASSES: GatePass[] = [
  {
    id: 'pass-hist-1',
    passNumber: 'GP-20260825-01',
    date: '2026-08-25',
    formattedDate: '25-Aug-2026',
    outTime: '05:30 PM',
    expectedInTime: '08:30 PM',
    purpose: 'General Evening Outing & Essentials',
    passType: 'ROOM_WISE',
    studentCount: 5,
    students: INITIAL_STUDENTS.slice(43, 48), // Room 10
    roomsIncluded: ['10'],
    generatedBy: 'Warden (Boys Hostel-I)',
    notes: 'Approved for Room 10 students',
    createdAt: '2026-08-25T17:30:00.000Z',
  },
  {
    id: 'pass-hist-2',
    passNumber: 'GP-20260820-02',
    date: '2026-08-20',
    formattedDate: '20-Aug-2026',
    outTime: '06:00 PM',
    expectedInTime: '23-Aug-2026 07:00 PM',
    purpose: 'Month-End Hometown Leave (All Rooms)',
    passType: 'MONTH_END',
    studentCount: 97,
    students: INITIAL_STUDENTS,
    roomsIncluded: Array.from(new Set(INITIAL_STUDENTS.map((s) => s.roomNo))),
    generatedBy: 'Deputy Warden',
    notes: 'Month end weekend leave approved by Principal',
    createdAt: '2026-08-20T18:00:00.000Z',
  },
];

export const getStudents = (): Student[] => {
  if (typeof window === 'undefined') return INITIAL_STUDENTS;
  try {
    const raw = localStorage.getItem(STUDENTS_KEY);
    if (!raw) {
      localStorage.setItem(STUDENTS_KEY, JSON.stringify(INITIAL_STUDENTS));
      return INITIAL_STUDENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(INITIAL_STUDENTS));
    return INITIAL_STUDENTS;
  } catch (e) {
    console.error('Failed to parse students from storage:', e);
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(INITIAL_STUDENTS));
    return INITIAL_STUDENTS;
  }
};

export const saveStudents = (students: Student[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save students to storage:', e);
  }
};

export const addStudent = (student: Omit<Student, 'id' | 'sNo'>): Student => {
  const current = getStudents();
  const newStudent: Student = {
    ...student,
    id: `std-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    sNo: current.length + 1,
  };
  const updated = [...current, newStudent];
  saveStudents(updated);
  return newStudent;
};

export const updateStudent = (id: string, updates: Partial<Student>): boolean => {
  const current = getStudents();
  const index = current.findIndex((s) => s.id === id);
  if (index === -1) return false;
  current[index] = { ...current[index], ...updates };
  saveStudents(current);
  return true;
};

export const deleteStudent = (id: string): boolean => {
  const current = getStudents();
  const filtered = current.filter((s) => s.id !== id);
  if (filtered.length === current.length) return false;
  // Re-index S.No
  const reIndexed = filtered.map((s, idx) => ({ ...s, sNo: idx + 1 }));
  saveStudents(reIndexed);
  return true;
};

export const resetMasterDatabase = (): Student[] => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(INITIAL_STUDENTS));
  }
  return INITIAL_STUDENTS;
};

export const getGatePasses = (): GatePass[] => {
  if (typeof window === 'undefined') return SAMPLE_HISTORIC_PASSES;
  try {
    const raw = localStorage.getItem(PASSES_KEY);
    if (!raw) {
      localStorage.setItem(PASSES_KEY, JSON.stringify(SAMPLE_HISTORIC_PASSES));
      return SAMPLE_HISTORIC_PASSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SAMPLE_HISTORIC_PASSES;
  } catch (e) {
    console.error('Failed to parse gate passes from storage:', e);
    return SAMPLE_HISTORIC_PASSES;
  }
};

export const saveGatePass = (passData: Omit<GatePass, 'id' | 'passNumber' | 'createdAt'>): GatePass => {
  const current = getGatePasses();
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const dailyCount = current.filter((p) => p.date === passData.date).length + 1;
  const passNumber = `GP-${dateStr}-${String(dailyCount).padStart(2, '0')}`;

  const newPass: GatePass = {
    ...passData,
    id: `pass-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    passNumber,
    createdAt: new Date().toISOString(),
  };

  const updated = [newPass, ...current];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PASSES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save gate pass:', e);
    }
  }
  return newPass;
};

export const deleteGatePass = (id: string): boolean => {
  const current = getGatePasses();
  const filtered = current.filter((p) => p.id !== id);
  if (filtered.length === current.length) return false;
  if (typeof window !== 'undefined') {
    localStorage.setItem(PASSES_KEY, JSON.stringify(filtered));
  }
  return true;
};

export const getHostelInfo = (): HostelInfo => {
  if (typeof window === 'undefined') return DEFAULT_HOSTEL_INFO;
  try {
    const raw = localStorage.getItem(HOSTEL_INFO_KEY);
    if (!raw) {
      localStorage.setItem(HOSTEL_INFO_KEY, JSON.stringify(DEFAULT_HOSTEL_INFO));
      return DEFAULT_HOSTEL_INFO;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_HOSTEL_INFO;
  }
};

export const saveHostelInfo = (info: HostelInfo): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HOSTEL_INFO_KEY, JSON.stringify(info));
  } catch (e) {
    console.error('Failed to save hostel info:', e);
  }
};

export const filterStudents = (students: Student[], filters: FilterOptions): Student[] => {
  return students.filter((s) => {
    // Room Filter (matches exact room or partial)
    if (filters.room && filters.room !== 'ALL') {
      const normalizedRoom = filters.room.replace(/^0+/, '');
      const studentRoomNormalized = s.roomNo.replace(/^0+/, '');
      if (s.roomNo !== filters.room && studentRoomNormalized !== normalizedRoom) {
        return false;
      }
    }

    // Department Filter
    if (filters.department && filters.department !== 'ALL') {
      if (s.department.toUpperCase() !== filters.department.toUpperCase()) {
        return false;
      }
    }

    // Year Filter
    if (filters.year && filters.year !== 'ALL') {
      if (s.year !== filters.year) {
        return false;
      }
    }

    // Text Search
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchRoom = s.roomNo.toLowerCase().includes(q);
      const matchDept = s.department.toLowerCase().includes(q);
      const matchSNo = String(s.sNo).includes(q);
      if (!matchName && !matchRoom && !matchDept && !matchSNo) {
        return false;
      }
    }

    return true;
  });
};
