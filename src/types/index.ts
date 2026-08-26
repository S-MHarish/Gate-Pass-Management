export interface Student {
  id: string;
  sNo: number;
  roomNo: string;
  name: string;
  department: string;
  year: 'II' | 'III' | 'IV' | 'I';
  parentPhone: string;
  isActive?: boolean;
}

export interface GatePass {
  id: string;
  passNumber: string;
  date: string; // e.g. "2026-08-26"
  formattedDate: string; // e.g. "26-Aug-2026"
  outTime: string; // e.g. "05:00 PM"
  expectedInTime: string; // e.g. "08:30 PM" or "28-Aug-2026 07:00 PM"
  purpose: string; // e.g. "Month-End Hometown Outing", "General Outing", "Emergency / Medical", "Academic Project"
  passType: 'MONTH_END' | 'ROOM_WISE' | 'CUSTOM' | 'INDIVIDUAL';
  studentCount: number;
  students: Student[];
  roomsIncluded: string[];
  generatedBy: string; // e.g. "Warden (Boys Hostel-I)"
  notes?: string;
  createdAt: string;
}

export interface HostelInfo {
  collegeName: string;
  hostelName: string;
  passTitle: string;
  floorInfo: string;
  asstWarden: string;
  deputyWarden: string;
  phoneContact: string;
}

export interface FilterOptions {
  search: string;
  room: string;
  department: string;
  year: string;
}
