'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Student, GatePass, HostelInfo, ConnectionStatus, RealtimeEventPayload } from '@/types';
import { INITIAL_STUDENTS, DEFAULT_HOSTEL_INFO } from '@/lib/seedData';

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

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [hostelInfo, setHostelInfo] = useState<HostelInfo>(DEFAULT_HOSTEL_INFO);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // default true or verified by API
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  // Fetch full state from backend database
  const refreshAll = useCallback(async () => {
    try {
      const [stdRes, passRes, setRes, authRes] = await Promise.all([
        fetch('/api/students', { cache: 'no-store' }),
        fetch('/api/passes', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' }),
        fetch('/api/auth', { credentials: 'include', cache: 'no-store' }).catch(() => null),
      ]);

      if (stdRes.ok) {
        const stdJson = await stdRes.json();
        if (stdJson.students) setStudents(stdJson.students);
      }
      if (passRes.ok) {
        const passJson = await passRes.json();
        if (passJson.passes) setPasses(passJson.passes);
      }
      if (setRes.ok) {
        const setJson = await setRes.json();
        if (setJson.hostelInfo) setHostelInfo(setJson.hostelInfo);
      }
      if (authRes && authRes.ok) {
        const authJson = await authRes.json();
        setIsAuthenticated(Boolean(authJson.authenticated));
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
        // On reconnection, reconcile state from DB
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
        setConnectionStatus('disconnected');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Exponential backoff reconnect
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(1.5, attempts), 10000);
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

  // Initial load and SSE setup
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
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      const data = await res.json();
      if (data.success && data.student) {
        return { success: true, student: data.student };
      }
      return { success: false, error: data.error || 'Failed to add student.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.student) {
        return { success: true, student: data.student };
      }
      return { success: false, error: data.error || 'Failed to update student.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to delete student.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  const bulkImportStudents = async (
    studentsToImport: Array<Omit<Student, 'id' | 'sNo'>>,
    mode: 'append' | 'replace'
  ) => {
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsToImport, mode }),
      });
      const data = await res.json();
      if (data.success) {
        return { success: true, count: data.count };
      }
      return { success: false, error: data.error || 'Failed to import students.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  const resetMasterDatabase = async () => {
    try {
      const res = await fetch('/api/students/reset', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to reset database.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  // Gate Pass Mutations
  const createPass = async (passData: Omit<GatePass, 'id' | 'passNumber' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passData),
      });
      const data = await res.json();
      if (data.success && data.pass) {
        return { success: true, pass: data.pass };
      }
      return { success: false, error: data.error || 'Failed to create gate pass.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  const deletePass = async (id: string) => {
    try {
      const res = await fetch(`/api/passes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to delete pass.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  // Settings Mutation
  const updateHostelInfo = async (info: HostelInfo) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to save settings.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  // Auth Operations
  const login = async (password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: 'admin', password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        refreshAll();
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid credentials.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
        credentials: 'include',
      });
      setIsAuthenticated(false);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', currentPassword, newPassword }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to change password.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
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
