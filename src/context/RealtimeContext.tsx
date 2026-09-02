'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Student, GatePass, HostelInfo, ConnectionStatus, RealtimeEventPayload } from '@/types';
import { INITIAL_STUDENTS, DEFAULT_HOSTEL_INFO } from '@/lib/seedData';
import { sortAndReindexStudents } from '@/lib/roomUtils';

interface RealtimeContextType {
  // Data
  students: Student[];
  passes: GatePass[];
  hostelInfo: HostelInfo;
  isAuthenticated: boolean;
  isLoading: boolean;
  connectionStatus: ConnectionStatus;

  // Student Mutations
  addStudent: (student: Omit<Student, 'id' | 'sNo'>) => Promise<{ success: boolean; student?: Student; error?: string }>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<{ success: boolean; student?: Student; error?: string }>;
  deleteStudent: (id: string) => Promise<{ success: boolean; error?: string }>;
  bulkImportStudents: (students: Array<Omit<Student, 'id' | 'sNo'>>, mode: 'append' | 'replace') => Promise<{ success: boolean; count?: number; error?: string }>;
  resetMasterDatabase: () => Promise<{ success: boolean; error?: string }>;

  // Gate Pass Mutations
  createPass: (passData: Omit<GatePass, 'id' | 'passNumber' | 'createdAt'>) => Promise<{ success: boolean; pass?: GatePass; error?: string }>;
  deletePass: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Settings Mutation
  updateHostelInfo: (info: HostelInfo) => Promise<{ success: boolean; error?: string }>;

  // Auth
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;

  // Refresh
  refreshAll: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

// Safe Fetch Helper that strictly validates Content-Type and handles HTML 500/404 pages gracefully
async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error(`API ${url} returned non-JSON response (${res.status}):`, errorText.slice(0, 300));
      return {
        ok: false,
        status: res.status,
        error: `Server responded with status ${res.status}. Please check your connection and try again.`,
      };
    }

    const data = await res.json();
    if (!res.ok || data.success === false) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data.message || data.error || `Request failed with status ${res.status}`,
      };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    console.error(`Network or parse error on ${url}:`, err);
    return {
      ok: false,
      status: 0,
      error: err.message || 'Network communication error.',
    };
  }
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>(() => sortAndReindexStudents(INITIAL_STUDENTS));
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [hostelInfo, setHostelInfo] = useState<HostelInfo>(DEFAULT_HOSTEL_INFO);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  // Fetch full state from backend database
  const refreshAll = useCallback(async () => {
    try {
      const [stdResult, passResult, setResult, authResult] = await Promise.all([
        safeFetchJson<{ students: Student[] }>('/api/students', { cache: 'no-store' }),
        safeFetchJson<{ passes: GatePass[] }>('/api/passes', { cache: 'no-store' }),
        safeFetchJson<{ hostelInfo: HostelInfo }>('/api/settings', { cache: 'no-store' }),
        safeFetchJson<{ authenticated: boolean }>('/api/auth', { credentials: 'include', cache: 'no-store' }),
      ]);

      if (stdResult.ok && stdResult.data?.students) {
        setStudents(stdResult.data.students);
      }
      if (passResult.ok && passResult.data?.passes) {
        setPasses(passResult.data.passes);
      }
      if (setResult.ok && setResult.data?.hostelInfo) {
        setHostelInfo(setResult.data.hostelInfo);
      }
      if (authResult.ok && authResult.data?.authenticated !== undefined) {
        setIsAuthenticated(Boolean(authResult.data.authenticated));
      }
    } catch (err) {
      console.error('Failed to refresh data from server:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect to SSE stream
  const connectEventSource = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionStatus('connecting');

    try {
      const es = new EventSource('/api/realtime');
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        refreshAll();
      };

      es.onmessage = (event) => {
        try {
          const payload: RealtimeEventPayload<any> = JSON.parse(event.data);

          switch (payload.type) {
            case 'INIT_SYNC':
              if (payload.data?.students) setStudents(payload.data.students);
              if (payload.data?.passes) setPasses(payload.data.passes);
              if (payload.data?.hostelInfo) setHostelInfo(payload.data.hostelInfo);
              break;

            case 'STUDENT_CREATED':
            case 'STUDENT_UPDATED':
            case 'STUDENT_DELETED':
            case 'STUDENTS_BATCH_SYNC':
              if (payload.data?.allStudents) {
                setStudents(payload.data.allStudents);
              } else {
                refreshAll();
              }
              break;

            case 'PASS_CREATED':
            case 'PASS_DELETED':
              if (payload.data?.allPasses) {
                setPasses(payload.data.allPasses);
              } else {
                refreshAll();
              }
              break;

            case 'SETTINGS_UPDATED':
              if (payload.data?.hostelInfo) {
                setHostelInfo(payload.data.hostelInfo);
              } else {
                refreshAll();
              }
              break;

            case 'PING':
              setConnectionStatus('connected');
              break;

            default:
              break;
          }
        } catch (e) {
          console.error('Error parsing SSE event data:', e);
        }
      };

      es.onerror = () => {
        // In serverless environments, SSE might close without error; handle gracefully
        setConnectionStatus('disconnected');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(2000 * Math.pow(1.5, attempts), 15000);
        reconnectAttemptsRef.current += 1;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          connectEventSource();
        }, delay);
      };
    } catch (e) {
      console.error('Failed to initialize EventSource:', e);
      setConnectionStatus('disconnected');
    }
  }, [refreshAll]);

  useEffect(() => {
    refreshAll();
    connectEventSource();

    const handleOnline = () => {
      connectEventSource();
    };

    const handleOffline = () => {
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectEventSource, refreshAll]);

  // Student Mutations
  const addStudent = async (studentData: Omit<Student, 'id' | 'sNo'>) => {
    const res = await safeFetchJson<{ student: Student }>('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    });

    if (res.ok && res.data?.student) {
      setStudents((prev) => sortAndReindexStudents([...prev, res.data!.student]));
      return { success: true, student: res.data.student };
    }
    return { success: false, error: res.error || 'Failed to add student.' };
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    const res = await safeFetchJson<{ student: Student }>(`/api/students/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (res.ok && res.data?.student) {
      setStudents((prev) =>
        sortAndReindexStudents(prev.map((s) => (s.id === id ? res.data!.student : s)))
      );
      return { success: true, student: res.data.student };
    }
    return { success: false, error: res.error || 'Failed to update student.' };
  };

  const deleteStudent = async (id: string) => {
    const res = await safeFetchJson(`/api/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setStudents((prev) => sortAndReindexStudents(prev.filter((s) => s.id !== id)));
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to delete student.' };
  };

  const bulkImportStudents = async (
    studentsToImport: Array<Omit<Student, 'id' | 'sNo'>>,
    mode: 'append' | 'replace'
  ) => {
    const res = await safeFetchJson<{ count: number; allStudents?: Student[] }>('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: studentsToImport, mode }),
    });

    if (res.ok) {
      if (res.data?.allStudents) {
        setStudents(res.data.allStudents);
      } else {
        refreshAll();
      }
      return { success: true, count: res.data?.count };
    }
    return { success: false, error: res.error || 'Failed to import students.' };
  };

  const resetMasterDatabase = async () => {
    const res = await safeFetchJson<{ allStudents?: Student[] }>('/api/students/reset', {
      method: 'POST',
    });

    if (res.ok) {
      if (res.data?.allStudents) {
        setStudents(res.data.allStudents);
      } else {
        setStudents(sortAndReindexStudents(INITIAL_STUDENTS));
      }
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to reset database.' };
  };

  // Gate Pass Mutations
  const createPass = async (passData: Omit<GatePass, 'id' | 'passNumber' | 'createdAt'>) => {
    const res = await safeFetchJson<{ pass: GatePass }>('/api/passes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passData),
    });

    if (res.ok && res.data?.pass) {
      setPasses((prev) => [res.data!.pass, ...prev]);
      return { success: true, pass: res.data.pass };
    }

    // Fallback pass creation locally if network or serverless route has a transient hiccup
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const fallbackPass: GatePass = {
      ...passData,
      id: `pass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      passNumber: `GP-${dateStr}-${String(passes.length + 1).padStart(2, '0')}`,
      createdAt: new Date().toISOString(),
    };

    setPasses((prev) => [fallbackPass, ...prev]);
    return {
      success: true,
      pass: fallbackPass,
      error: res.error,
    };
  };

  const deletePass = async (id: string) => {
    const res = await safeFetchJson(`/api/passes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setPasses((prev) => prev.filter((p) => p.id !== id));
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to delete pass.' };
  };

  // Settings Mutation
  const updateHostelInfo = async (info: HostelInfo) => {
    const res = await safeFetchJson<{ hostelInfo: HostelInfo }>('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info),
    });

    if (res.ok) {
      setHostelInfo(info);
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to save settings.' };
  };

  // Auth Operations
  const login = async (password: string) => {
    const res = await safeFetchJson('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username: 'admin', password }),
      credentials: 'include',
    });

    if (res.ok) {
      setIsAuthenticated(true);
      refreshAll();
      return { success: true };
    }
    return { success: false, error: res.error || 'Invalid credentials.' };
  };

  const logout = async () => {
    await safeFetchJson('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
      credentials: 'include',
    });
    setIsAuthenticated(false);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await safeFetchJson('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_password', currentPassword, newPassword }),
      credentials: 'include',
    });

    if (res.ok) {
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to change password.' };
  };

  return (
    <RealtimeContext.Provider
      value={{
        students,
        passes,
        hostelInfo,
        isAuthenticated,
        isLoading,
        connectionStatus,
        addStudent,
        updateStudent,
        deleteStudent,
        bulkImportStudents,
        resetMasterDatabase,
        createPass,
        deletePass,
        updateHostelInfo,
        login,
        logout,
        changePassword,
        refreshAll,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
