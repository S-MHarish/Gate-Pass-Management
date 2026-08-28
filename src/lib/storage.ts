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

export const compareRoomNumbers = (roomA: string, roomB: string): number => {
  const numA = parseInt(String(roomA).replace(/[^0-9]/g, ''), 10);
  const numB = parseInt(String(roomB).replace(/[^0-9]/g, ''), 10);

  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
    return numA - numB;
  }

  return String(roomA).localeCompare(String(roomB), undefined, { numeric: true, sensitivity: 'base' });
};

export const sortAndReindexStudents = (students: Student[]): Student[] => {
  if (!students || students.length === 0) return [];

  // Group students by room preserving original order within each room
  const roomGroups = new Map<string, Student[]>();

  students.forEach((student) => {
    const key = student.roomNo;
    if (!roomGroups.has(key)) {
      roomGroups.set(key, []);
    }
    roomGroups.get(key)!.push(student);
  });

  // Sort rooms numerically (Room 1, 2, ..., 9, 10, 22)
  const sortedRooms = Array.from(roomGroups.keys()).sort(compareRoomNumbers);

  // Flatten the room groups into single sorted array
  const sortedStudents: Student[] = [];
  sortedRooms.forEach((room) => {
    const members = roomGroups.get(room) || [];
    sortedStudents.push(...members);
  });

  // Re-index global S.No in sequential 1, 2, 3... order
  return sortedStudents.map((student, idx) => ({
    ...student,
    sNo: idx + 1,
  }));
};

export const getStudents = (): Student[] => {
  if (typeof window === 'undefined') return sortAndReindexStudents(INITIAL_STUDENTS);
  try {
    const raw = localStorage.getItem(STUDENTS_KEY);
    if (!raw) {
      const initialSorted = sortAndReindexStudents(INITIAL_STUDENTS);
      localStorage.setItem(STUDENTS_KEY, JSON.stringify(initialSorted));
      return initialSorted;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return sortAndReindexStudents(parsed);
    }
    const initialSorted = sortAndReindexStudents(INITIAL_STUDENTS);
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(initialSorted));
    return initialSorted;
  } catch (e) {
    console.error('Failed to parse students from storage:', e);
    const initialSorted = sortAndReindexStudents(INITIAL_STUDENTS);
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(initialSorted));
    return initialSorted;
  }
};

export const saveStudents = (students: Student[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const sortedAndIndexed = sortAndReindexStudents(students);
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(sortedAndIndexed));
  } catch (e) {
    console.error('Failed to save students to storage:', e);
  }
};

export const isStudentDuplicate = (
  students: Student[],
  candidate: { name: string; roomNo: string; parentPhone?: string },
  excludeId?: string
): boolean => {
  const candidateName = candidate.name.trim().toLowerCase().replace(/\s+/g, ' ');
  const candidateRoom = candidate.roomNo.trim().replace(/^0+/, '');
  const candidatePhone = candidate.parentPhone ? candidate.parentPhone.replace(/\D/g, '') : '';

  if (!candidateName) return false;

  return students.some((s) => {
    if (excludeId && s.id === excludeId) return false;
    const sName = s.name.trim().toLowerCase().replace(/\s+/g, ' ');
    const sRoom = s.roomNo.trim().replace(/^0+/, '');
    const sPhone = s.parentPhone ? s.parentPhone.replace(/\D/g, '') : '';

    // Same student name in same room
    if (sName === candidateName && sRoom === candidateRoom) {
      return true;
    }

    // Exact full name match in database (if distinctive)
    if (sName === candidateName && candidateName.length >= 3) {
      return true;
    }

    // Exact phone match if phone has 10 digits
    if (candidatePhone && sPhone && candidatePhone.length >= 10 && candidatePhone === sPhone) {
      return true;
    }

    return false;
  });
};

export const getNextSNo = (students: Student[]): number => {
  if (!students || students.length === 0) return 1;
  return students.length + 1;
};

export const addStudent = (
  student: Omit<Student, 'id' | 'sNo'>
): { success: boolean; student?: Student; error?: string } => {
  const current = getStudents();

  if (isStudentDuplicate(current, student)) {
    return { success: false, error: 'Student already exists.' };
  }

  const newStudent: Student = {
    ...student,
    id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sNo: current.length + 1,
    isActive: true,
  };

  const updated = sortAndReindexStudents([...current, newStudent]);
  saveStudents(updated);
  const created = updated.find((s) => s.id === newStudent.id) || newStudent;
  return { success: true, student: created };
};

export const updateStudent = (id: string, updates: Partial<Student>): { success: boolean; error?: string } => {
  const current = getStudents();
  const index = current.findIndex((s) => s.id === id);
  if (index === -1) return { success: false, error: 'Student not found.' };

  const target = current[index];
  const candidate = {
    name: updates.name ?? target.name,
    roomNo: updates.roomNo ?? target.roomNo,
    parentPhone: updates.parentPhone ?? target.parentPhone,
  };

  if (isStudentDuplicate(current, candidate, id)) {
    return { success: false, error: 'Student with these details already exists.' };
  }

  current[index] = { ...target, ...updates };
  saveStudents(current);
  return { success: true };
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
    // Room Filter (matches exact room or normalized number)
    if (filters.room && filters.room !== 'ALL') {
      const filterClean = filters.room.replace(/[^0-9]/g, '');
      const studentClean = s.roomNo.replace(/[^0-9]/g, '');
      if (filterClean && studentClean) {
        if (
          s.roomNo !== filters.room &&
          filterClean !== studentClean &&
          filterClean.padStart(2, '0') !== studentClean.padStart(2, '0')
        ) {
          return false;
        }
      } else if (s.roomNo.toLowerCase() !== filters.room.toLowerCase()) {
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
      const cleanQ = q.replace(/[^0-9]/g, '');
      const matchName = s.name.toLowerCase().includes(q);
      const normalizedRoom = s.roomNo.replace(/^0+/, '');
      const matchRoom =
        s.roomNo.toLowerCase() === q ||
        `room ${s.roomNo}`.toLowerCase() === q ||
        `r-${s.roomNo}`.toLowerCase() === q ||
        `r ${s.roomNo}`.toLowerCase() === q ||
        (cleanQ !== '' && normalizedRoom === cleanQ.replace(/^0+/, '')) ||
        (cleanQ !== '' && q.startsWith('room ') && normalizedRoom === q.replace('room ', '').trim().replace(/^0+/, ''));
      const matchDept = s.department.toLowerCase() === q || s.department.toLowerCase().includes(q);
      const matchPhone = s.parentPhone ? s.parentPhone.toLowerCase().includes(q) : false;
      const matchSNo = String(s.sNo) === q || `sno ${s.sNo}`.toLowerCase() === q;

      if (!matchName && !matchRoom && !matchDept && !matchPhone && !matchSNo) {
        return false;
      }
    }

    return true;
  });
};
