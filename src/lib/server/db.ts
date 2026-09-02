import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Student, GatePass, HostelInfo } from '@/types';
import { INITIAL_STUDENTS, DEFAULT_HOSTEL_INFO } from '../seedData';
import { compareRoomNumbers, sortAndReindexStudents } from '../roomUtils';

// Determine safe storage directory (use /tmp on Vercel serverless to avoid EROFS)
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'hostel_data')
  : path.join(process.cwd(), 'data');

const DB_SQLITE_PATH = path.join(DATA_DIR, 'hostel.db');
const DB_JSON_PATH = path.join(DATA_DIR, 'hostel_store.json');

// Safely ensure directory exists without throwing
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create data directory, using in-memory store:', e);
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// ---------------------------------------------------------------------------
// In-Memory & File-Backed Resilient JSON Store (Fallback & Serverless-Safe)
// ---------------------------------------------------------------------------

interface JsonDatabaseStore {
  students: Student[];
  gatePasses: GatePass[];
  hostelInfo: HostelInfo;
  adminAuth: {
    username: string;
    passwordHash: string;
    salt: string;
    updatedAt: string;
  };
}

let memoryStore: JsonDatabaseStore | null = null;

function getDefaultStore(): JsonDatabaseStore {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword('admin@vsb2026', salt);

  return {
    students: sortAndReindexStudents(INITIAL_STUDENTS),
    gatePasses: [],
    hostelInfo: { ...DEFAULT_HOSTEL_INFO },
    adminAuth: {
      username: 'admin',
      passwordHash,
      salt,
      updatedAt: new Date().toISOString(),
    },
  };
}

function loadJsonStore(): JsonDatabaseStore {
  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
        memoryStore = {
          students: sortAndReindexStudents(parsed.students),
          gatePasses: Array.isArray(parsed.gatePasses) ? parsed.gatePasses : [],
          hostelInfo: parsed.hostelInfo || { ...DEFAULT_HOSTEL_INFO },
          adminAuth: parsed.adminAuth || getDefaultStore().adminAuth,
        };
        return memoryStore;
      }
    }
  } catch (err) {
    console.warn('Failed to load JSON store from disk, initializing default:', err);
  }

  memoryStore = getDefaultStore();
  persistJsonStore();
  return memoryStore;
}

function persistJsonStore(): void {
  if (!memoryStore) return;
  try {
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    // If filesystem is read-only, keep in memory without throwing
  }
}

// ---------------------------------------------------------------------------
// SQLite Engine Initialization with Safe Dynamic Load
// ---------------------------------------------------------------------------

let sqliteDbInstance: any = null;
let isSqliteSupported: boolean | null = null;

function getSqliteDatabase(): any | null {
  if (isSqliteSupported === false) return null;
  if (sqliteDbInstance) return sqliteDbInstance;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(DB_SQLITE_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    initializeSqliteSchema(db);
    sqliteDbInstance = db;
    isSqliteSupported = true;
    return sqliteDbInstance;
  } catch (err) {
    console.info('SQLite (node:sqlite) not available in current runtime. Using resilient JSON store:', (err as any)?.message);
    isSqliteSupported = false;
    sqliteDbInstance = null;
    return null;
  }
}

function initializeSqliteSchema(db: any) {
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS hostel_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_auth (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

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

  const settingsRow = db.prepare("SELECT value FROM hostel_settings WHERE key = 'hostel_info'").get() as { value: string } | undefined;
  if (!settingsRow) {
    db.prepare("INSERT OR REPLACE INTO hostel_settings (key, value) VALUES ('hostel_info', ?)").run(
      JSON.stringify(DEFAULT_HOSTEL_INFO)
    );
  }

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

// ---------------------------------------------------------------------------
// Student Operations (Auto-routes to SQLite or JSON Store)
// ---------------------------------------------------------------------------

export function getAllStudents(): Student[] {
  const db = getSqliteDatabase();
  if (db) {
    try {
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
    } catch (e) {
      console.warn('SQLite read failed, falling back to JSON store:', e);
    }
  }

  const store = loadJsonStore();
  return sortAndReindexStudents(store.students);
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
  if (isStudentDuplicateInDB(data)) {
    return { success: false, error: 'A student with these details already exists in the database.' };
  }

  const newId = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const db = getSqliteDatabase();
  if (db) {
    try {
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
    } catch (e) {
      console.warn('SQLite insert failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  const newStudent: Student = {
    ...data,
    id: newId,
    sNo: store.students.length + 1,
    name: data.name.trim().toUpperCase(),
    roomNo: data.roomNo.trim(),
    department: data.department.trim().toUpperCase(),
    parentPhone: data.parentPhone?.trim() || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  store.students = sortAndReindexStudents([...store.students, newStudent]);
  persistJsonStore();
  const created = store.students.find((s) => s.id === newId) || newStudent;
  return { success: true, student: created };
}

export function updateStudentInDB(
  id: string,
  updates: Partial<Student>
): { success: boolean; student?: Student; error?: string } {
  const currentStudents = getAllStudents();
  const existing = currentStudents.find((s) => s.id === id);

  if (!existing) {
    return { success: false, error: 'Student not found in database.' };
  }

  const candidate = {
    name: updates.name ?? existing.name,
    roomNo: updates.roomNo ?? existing.roomNo,
    parentPhone: updates.parentPhone ?? existing.parentPhone,
  };

  if (isStudentDuplicateInDB(candidate, id)) {
    return { success: false, error: 'Another student with these details already exists in the database.' };
  }

  const newName = updates.name !== undefined ? updates.name.trim().toUpperCase() : existing.name;
  const newRoom = updates.roomNo !== undefined ? updates.roomNo.trim() : existing.roomNo;
  const newDept = updates.department !== undefined ? updates.department.trim().toUpperCase() : existing.department;
  const newYear = updates.year !== undefined ? updates.year : existing.year;
  const newPhone = updates.parentPhone !== undefined ? updates.parentPhone.trim() : existing.parentPhone;
  const now = new Date().toISOString();

  const db = getSqliteDatabase();
  if (db) {
    try {
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
    } catch (e) {
      console.warn('SQLite update failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  const idx = store.students.findIndex((s) => s.id === id);
  if (idx !== -1) {
    store.students[idx] = {
      ...store.students[idx],
      name: newName,
      roomNo: newRoom,
      department: newDept,
      year: newYear,
      parentPhone: newPhone,
      updatedAt: now,
      version: (store.students[idx].version || 1) + 1,
    };
    store.students = sortAndReindexStudents(store.students);
    persistJsonStore();
    const updated = store.students.find((s) => s.id === id);
    return { success: true, student: updated };
  }

  return { success: false, error: 'Student not found.' };
}

export function deleteStudentFromDB(id: string): boolean {
  const db = getSqliteDatabase();
  if (db) {
    try {
      const res = db.prepare('DELETE FROM students WHERE id = ?').run(id);
      if (res.changes > 0) {
        const all = getAllStudents();
        const updateSNoStmt = db.prepare('UPDATE students SET s_no = ? WHERE id = ?');
        for (const s of all) {
          updateSNoStmt.run(s.sNo, s.id);
        }
        return true;
      }
    } catch (e) {
      console.warn('SQLite delete failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  const filtered = store.students.filter((s) => s.id !== id);
  if (filtered.length === store.students.length) return false;

  store.students = sortAndReindexStudents(filtered);
  persistJsonStore();
  return true;
}

export function bulkImportStudentsToDB(
  students: Array<Omit<Student, 'id' | 'sNo'>>,
  mode: 'append' | 'replace'
): { success: boolean; count: number; error?: string } {
  const db = getSqliteDatabase();
  const now = new Date().toISOString();

  if (db) {
    try {
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
    } catch (e) {
      console.warn('SQLite bulk import failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  let baseList = mode === 'replace' ? [] : [...store.students];
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
    baseList.push({
      ...item,
      id,
      sNo: baseList.length + 1,
      name: candidate.name,
      roomNo: candidate.roomNo,
      department: item.department.trim().toUpperCase(),
      parentPhone: candidate.parentPhone,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    addedCount++;
  }

  store.students = sortAndReindexStudents(baseList);
  persistJsonStore();
  return { success: true, count: addedCount };
}

export function resetStudentsToDefaultDB(): Student[] {
  const db = getSqliteDatabase();
  if (db) {
    try {
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
    } catch (e) {
      console.warn('SQLite reset failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  store.students = sortAndReindexStudents(INITIAL_STUDENTS);
  persistJsonStore();
  return store.students;
}

// ---------------------------------------------------------------------------
// Gate Pass Operations
// ---------------------------------------------------------------------------

export function getAllGatePasses(): GatePass[] {
  const db = getSqliteDatabase();
  if (db) {
    try {
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
    } catch (e) {
      console.warn('SQLite gate passes read failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  return store.gatePasses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createGatePassInDB(
  passData: Omit<GatePass, 'id' | 'passNumber' | 'createdAt'>
): GatePass {
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

  const db = getSqliteDatabase();
  if (db) {
    try {
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
    } catch (e) {
      console.warn('SQLite gate pass insert failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  store.gatePasses = [newPass, ...store.gatePasses];
  persistJsonStore();
  return newPass;
}

export function deleteGatePassFromDB(id: string): boolean {
  const db = getSqliteDatabase();
  if (db) {
    try {
      const res = db.prepare('DELETE FROM gate_passes WHERE id = ?').run(id);
      if (res.changes > 0) return true;
    } catch (e) {
      console.warn('SQLite gate pass delete failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  const filtered = store.gatePasses.filter((p) => p.id !== id);
  if (filtered.length === store.gatePasses.length) return false;

  store.gatePasses = filtered;
  persistJsonStore();
  return true;
}

// ---------------------------------------------------------------------------
// Hostel Settings Operations
// ---------------------------------------------------------------------------

export function getHostelSettingsFromDB(): HostelInfo {
  const db = getSqliteDatabase();
  if (db) {
    try {
      const row = db.prepare("SELECT value FROM hostel_settings WHERE key = 'hostel_info'").get() as { value: string } | undefined;
      if (row) return JSON.parse(row.value);
    } catch (e) {
      console.warn('SQLite settings read failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  return store.hostelInfo || DEFAULT_HOSTEL_INFO;
}

export function updateHostelSettingsInDB(info: HostelInfo): HostelInfo {
  const db = getSqliteDatabase();
  if (db) {
    try {
      db.prepare("INSERT OR REPLACE INTO hostel_settings (key, value) VALUES ('hostel_info', ?)").run(
        JSON.stringify(info)
      );
      return info;
    } catch (e) {
      console.warn('SQLite settings update failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  store.hostelInfo = { ...info };
  persistJsonStore();
  return info;
}

// ---------------------------------------------------------------------------
// Admin Auth Operations
// ---------------------------------------------------------------------------

export function verifyAdminPassword(password: string): boolean {
  const db = getSqliteDatabase();
  if (db) {
    try {
      const row = db.prepare("SELECT password_hash, salt FROM admin_auth WHERE username = 'admin'").get() as {
        password_hash: string;
        salt: string;
      } | undefined;

      if (row) {
        const hash = hashPassword(password, row.salt);
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(row.password_hash, 'hex'));
      }
    } catch (e) {
      console.warn('SQLite auth read failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  const hash = hashPassword(password, store.adminAuth.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(store.adminAuth.passwordHash, 'hex'));
}

export function updateAdminPasswordInDB(newPassword: string): boolean {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(newPassword, salt);
  const now = new Date().toISOString();

  const db = getSqliteDatabase();
  if (db) {
    try {
      db.prepare("UPDATE admin_auth SET password_hash = ?, salt = ?, updated_at = ? WHERE username = 'admin'").run(
        hash,
        salt,
        now
      );
      return true;
    } catch (e) {
      console.warn('SQLite auth update failed, using JSON store:', e);
    }
  }

  const store = loadJsonStore();
  store.adminAuth = {
    username: 'admin',
    passwordHash: hash,
    salt,
    updatedAt: now,
  };
  persistJsonStore();
  return true;
}
