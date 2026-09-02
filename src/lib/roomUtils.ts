import { Student } from '@/types';

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

  const roomGroups = new Map<string, Student[]>();
  students.forEach((student) => {
    const key = student.roomNo;
    if (!roomGroups.has(key)) {
      roomGroups.set(key, []);
    }
    roomGroups.get(key)!.push(student);
  });

  const sortedRooms = Array.from(roomGroups.keys()).sort(compareRoomNumbers);
  const sortedStudents: Student[] = [];

  sortedRooms.forEach((room) => {
    const members = roomGroups.get(room) || [];
    sortedStudents.push(...members);
  });

  return sortedStudents.map((student, idx) => ({
    ...student,
    sNo: idx + 1,
  }));
};
