import { NextRequest, NextResponse } from 'next/server';
import { getAllStudents, updateStudentInDB, deleteStudentFromDB } from '@/lib/server/db';
import { broadcastRealtimeEvent } from '@/lib/server/events';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params?.id || '';
    const id = decodeURIComponent(rawId);
    const body = await request.json();

    const result = updateStudentInDB(id, body);
    if (!result.success || !result.student) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to update student in database.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const allStudents = getAllStudents();
    try {
      broadcastRealtimeEvent({
        type: 'STUDENT_UPDATED',
        data: { student: result.student, allStudents },
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Realtime broadcast skipped:', e);
    }

    return NextResponse.json(
      { success: true, student: result.student, message: 'Student updated successfully' },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal error updating student' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params?.id || '';
    const id = decodeURIComponent(rawId);
    const success = deleteStudentFromDB(id);

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Student not found in database or already deleted.' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const allStudents = getAllStudents();
    try {
      broadcastRealtimeEvent({
        type: 'STUDENT_DELETED',
        data: { id, allStudents },
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Realtime broadcast skipped:', e);
    }

    return NextResponse.json(
      { success: true, id, message: 'Student deleted successfully' },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal error deleting student' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
