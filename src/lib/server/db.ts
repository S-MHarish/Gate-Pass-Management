import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Student, GatePass, HostelInfo } from '@/types';
import { INITIAL_STUDENTS, DEFAULT_HOSTEL_INFO } from '../seedData';
import { compareRoomNumbers, sortAndReindexStudents } from '../roomUtils';

// Dynamically obtain DatabaseSync from node:sqlite
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'hostel.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbInstance: any = null;

export function getDatabase(): any {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initializeSchema(dbInstance);
  }
  return dbInstance;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function initializeSchema(db: any) {
  // Students Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      s_no INTEGER NOT NULL,
      room_no TEXT NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      year TEXT NOT NULL,
      parent_phone TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Gate Passes Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS gate_passes (
      id TEXT PRIMARY KEY,
      pass_number TEXT NOT NULL,
      date TEXT NOT NULL,
      formatted_date TEXT NOT NULL,
      out_time TEXT NOT NULL,
      expected_in_time TEXT NOT NULL,
      purpose TEXT NOT NULL,
      pass_type TEXT NOT NULL,
      student_count INTEGER NOT NULL,
      students_json TEXT NOT NULL,
      rooms_included_json TEXT NOT NULL,
      include_parent_phone INTEGER NOT NULL DEFAULT 0,
      generated_by TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Hostel Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hostel_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Admin Auth Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_auth (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed Students if empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM students WHERE is_active = 1').get() as { count: number };
  if (!countRow || countRow.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO students (id, s_no, room_no, name, department, year, parent_phone, is_active, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)
    `);

    const sortedSeed = sortAndReindexStudents(INITIAL_STUDENTS);
    const now = new Date().toISOString();

    for (const student of sortedSeed) {
      insertStmt.run(
        student.id,
        student.sNo,
        student.roomNo,
        student.name,
        student.department,
        student.year,
        student.parentPhone || '',
        now,
        now
      );
    }
  }

  // Seed Hostel Settings if empty
  const settingsRow = db.prepare("SELECT value FROM hostel_settings WHERE key = 'hostel_info'").get() as { value: string } | undefined;
  if (!settingsRow) {
    db.prepare("INSERT OR REPLACE INTO hostel_settings (key, value) VALUES ('hostel_info', ?)").run(
      JSON.stringify(DEFAULT_HOSTEL_INFO)
    );
  }

  // Seed Admin Auth if empty
  const authRow = db.prepare("SELECT username FROM admin_auth WHERE username = 'admin'").get();
  if (!authRow) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword('admin@vsb2026', salt);
    db.prepare('INSERT INTO admin_auth (username, password_hash, salt, updated_at) VALUES (?, ?, ?, ?)').run(
      'admin',
      hash,
      salt,
      new Date().toISOString()
    );
  }
}

// Student Database Operations
export function getAllStudents(): Student[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM students WHERE is_active = 1').all() as Array<{
    id: string;
    s_no: number;
    room_no: string;
    name: string;
    department: string;
    year: string;
    parent_phone: string;
    is_active: number;
    created_at: string;
    updated_at: string;
    version: number;
  }>;

  const rawStudents: Student[] = rows.map((r) => ({
    id: r.id,
    sNo: r.s_no,
    roomNo: r.room_no,
    name: r.name,
    department: r.department,
    year: r.year as Student['year'],
    parentPhone: r.parent_phone,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    version: r.version,
  }));

  return sortAndReindexStudents(rawStudents);
}

export function isStudentDuplicateInDB(
  candidate: { name: string; roomNo: string; parentPhone?: string },
  excludeId?: string
): boolean {
  const all = getAllStudents();
  const candidateName = candidate.name.trim().toLowerCase().replace(/\s+/g, ' ');
  const candidateRoom = candidate.roomNo.trim().replace(/^0+/, '');
  const candidatePhone = candidate.parentPhone ? candidate.parentPhone.replace(/\D/g, '') : '';

  if (!candidateName) return false;

  return all.some((s) => {
    if (excludeId && s.id === excludeId) return false;
    const sName = s.name.trim().toLowerCase().replace(/\s+/g, ' ');
    const sRoom = s.roomNo.trim().replace(/^0+/, '');
    const sPhone = s.parentPhone ? s.parentPhone.replace(/\D/g, '') : '';

    if (sName === candidateName && sRoom === candidateRoom) return true;
    if (sName === candidateName && candidateName.length >= 3) return true;
    if (candidatePhone && sPhone && candidatePhone.length >= 10 && candidatePhone === sPhone) return true;
    return false;
  });
}

export function createStudent(data: Omit<Student, 'id' | 'sNo'>): { success: boolean; student?: Student; error?: string } {
  const db = getDatabase();

  if (isStudentDuplicateInDB(data)) {
    return { success: false, error: 'A student with these details already exists in the database.' };
  }

  const newId = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO students (id, s_no, room_no, name, department, year, parent_phone, is_active, created_at, updated_at, version)
    VALUES (?, 9999, ?, ?, ?, ?, ?, 1, ?, ?, 1)
  `).run(
    newId,
    data.roomNo.trim(),
    data.name.trim().toUpperCase(),
    data.department.trim().toUpperCase(),
    data.year,
    data.parentPhone?.trim() || '',
    now,
    now
  );

  const all = getAllStudents();
  const updateSNoStmt = db.prepare('UPDATE students SET s_no = ? WHERE id = ?');
  for (const s of all) {
    updateSNoStmt.run(s.sNo, s.id);
  }

  const created = all.find((s) => s.id === newId);
  return { success: true, student: created };
}

export function updateStudentInDB(
  id: string,
  updates: Partial<Student>
): { success: boolean; student?: Student; error?: string } {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM students WHERE id = ? AND is_active = 1').get() as {
    id: string;
    room_no: string;
    name: string;
    department: string;
    year: string;
    parent_phone: string;
    version: number;
  } | undefined;

  if (!existing) {
    return { success: false, error: 'Student not found in database.' };
  }

  const candidate = {
    name: updates.name ?? existing.name,
    roomNo: updates.roomNo ?? existing.room_no,
    parentPhone: updates.parentPhone ?? existing.parent_phone,
  };

  if (isStudentDuplicateInDB(candidate, id)) {
    return { success: false, error: 'Another student with these details already exists in the database.' };
  }

  const newName = updates.name !== undefined ? updates.name.trim().toUpperCase() : existing.name;
  const newRoom = updates.roomNo !== undefined ? updates.roomNo.trim() : existing.room_no;
  const newDept = updates.department !== undefined ? updates.department.trim().toUpperCase() : existing.department;
  const newYear = updates.year !== undefined ? updates.year : existing.year;
  const newPhone = updates.parentPhone !== undefined ? updates.parentPhone.trim() : existing.parent_phone;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE students
    SET name = ?, room_no = ?, department = ?, year = ?, parent_phone = ?, updated_at = ?, version = version + 1
    WHERE id = ?
  `).run(newName, newRoom, newDept, newYear, newPhone, now, id);

  const all = getAllStudents();
  const updateSNoStmt = db.prepare('UPDATE students SET s_no = ? WHERE id = ?');
  for (const s of all) {
    updateSNoStmt.run(s.sNo, s.id);
  }

  const updated = all.find((s) => s.id === id);
  return { success: true, student: updated };
}

export function deleteStudentFromDB(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM students WHERE id = ?').run(id);
  if (res.changes === 0) return false;

  const all = getAllStudents();
  const updateSNoStmt = db.prepare('UPDATE students SET s_no = ? WHERE id = ?');
  for (const s of all) {
    updateSNoStmt.run(s.sNo, s.id);
  }

  return true;
}

export function bulkImportStudentsToDB(
  students: Array<Omit<Student, 'id' | 'sNo'>>,
  mode: 'append' | 'replace'
): { success: boolean; count: number; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (mode === 'replace') {
    db.prepare('DELETE FROM students').run();
  }

  const insertStmt = db.prepare(`
    INSERT INTO students (id, s_no, room_no, name, department, year, parent_phone, is_active, created_at, updated_at, version)
    VALUES (?, 9999, ?, ?, ?, ?, ?, 1, ?, ?, 1)
  `);

  let addedCount = 0;
  for (const item of students) {
    if (!item.name || !item.name.trim()) continue;

    const candidate = {
      name: item.name.trim().toUpperCase(),
      roomNo: item.roomNo.trim(),
      parentPhone: item.parentPhone?.trim() || '',
    };

    if (mode === 'append' && isStudentDuplicateInDB(candidate)) {
      continue;
    }

    const id = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    insertStmt.run(
      id,
      candidate.roomNo,
      candidate.name,
      item.department.trim().toUpperCase(),
      item.year,
      candidate.parentPhone,
      now,
      now
    );
    addedCount++;
  }

  const all = getAllStudents();
  const updateSNoStmt = db.prepare('UPDATE students SET s_no = ? WHERE id = ?');
  for (const s of all) {
    updateSNoStmt.run(s.sNo, s.id);
  }

  return { success: true, count: addedCount };
}

export function resetStudentsToDefaultDB(): Student[] {
  const db = getDatabase();
  db.prepare('DELETE FROM students').run();

  const insertStmt = db.prepare(`
    INSERT INTO students (id, s_no, room_no, name, department, year, parent_phone, is_active, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)
  `);

  const sortedSeed = sortAndReindexStudents(INITIAL_STUDENTS);
  const now = new Date().toISOString();

  for (const student of sortedSeed) {
    insertStmt.run(
      student.id,
      student.sNo,
      student.roomNo,
      student.name,
      student.department,
      student.year,
      student.parentPhone || '',
      now,
      now
    );
  }

  return getAllStudents();
}

// Gate Pass Operations
export function getAllGatePasses(): GatePass[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM gate_passes ORDER BY created_at DESC').all() as Array<{
    id: string;
    pass_number: string;
    date: string;
    formatted_date: string;
    out_time: string;
    expected_in_time: string;
    purpose: string;
    pass_type: string;
    student_count: number;
    students_json: string;
    rooms_included_json: string;
    include_parent_phone: number;
    generated_by: string;
    notes: string | null;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    passNumber: r.pass_number,
    date: r.date,
    formattedDate: r.formatted_date,
    outTime: r.out_time,
    expectedInTime: r.expected_in_time,
    purpose: r.purpose,
    passType: r.pass_type as GatePass['passType'],
    studentCount: r.student_count,
    students: JSON.parse(r.students_json || '[]'),
    roomsIncluded: JSON.parse(r.rooms_included_json || '[]'),
    includeParentPhone: Boolean(r.include_parent_phone),
    generatedBy: r.generated_by,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  }));
}

export function createGatePassInDB(
  passData: Omit<GatePass, 'id' | 'passNumber' | 'createdAt'>
): GatePass {
  const db = getDatabase();
  const currentPasses = getAllGatePasses();
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const dailyCount = currentPasses.filter((p) => p.date === passData.date).length + 1;
  const passNumber = `GP-${dateStr}-${String(dailyCount).padStart(2, '0')}`;

  const newPass: GatePass = {
    ...passData,
    id: `pass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    passNumber,
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO gate_passes (
      id, pass_number, date, formatted_date, out_time, expected_in_time,
      purpose, pass_type, student_count, students_json, rooms_included_json,
      include_parent_phone, generated_by, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newPass.id,
    newPass.passNumber,
    newPass.date,
    newPass.formattedDate,
    newPass.outTime,
    newPass.expectedInTime,
    newPass.purpose,
    newPass.passType,
    newPass.studentCount,
    JSON.stringify(newPass.students),
    JSON.stringify(newPass.roomsIncluded),
    newPass.includeParentPhone ? 1 : 0,
    newPass.generatedBy,
    newPass.notes || null,
    newPass.createdAt
  );

  return newPass;
}

export function deleteGatePassFromDB(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM gate_passes WHERE id = ?').run(id);
  return res.changes > 0;
}

// Hostel Settings Operations
export function getHostelSettingsFromDB(): HostelInfo {
  const db = getDatabase();
  const row = db.prepare("SELECT value FROM hostel_settings WHERE key = 'hostel_info'").get() as { value: string } | undefined;
  if (!row) return DEFAULT_HOSTEL_INFO;
  try {
    return JSON.parse(row.value);
  } catch {
    return DEFAULT_HOSTEL_INFO;
  }
}

export function updateHostelSettingsInDB(info: HostelInfo): HostelInfo {
  const db = getDatabase();
  db.prepare("INSERT OR REPLACE INTO hostel_settings (key, value) VALUES ('hostel_info', ?)").run(
    JSON.stringify(info)
  );
  return info;
}

// Admin Auth Operations
export function verifyAdminPassword(password: string): boolean {
  const db = getDatabase();
  const row = db.prepare("SELECT password_hash, salt FROM admin_auth WHERE username = 'admin'").get() as {
    password_hash: string;
    salt: string;
  } | undefined;

  if (!row) return false;
  const hash = hashPassword(password, row.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(row.password_hash, 'hex'));
}

export function updateAdminPasswordInDB(newPassword: string): boolean {
  const db = getDatabase();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(newPassword, salt);
  db.prepare("UPDATE admin_auth SET password_hash = ?, salt = ?, updated_at = ? WHERE username = 'admin'").run(
    hash,
    salt,
    new Date().toISOString()
  );
  return true;
}
