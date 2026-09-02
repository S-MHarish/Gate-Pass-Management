import { NextRequest, NextResponse } from 'next/server';
import { getAllStudents, updateStudentInDB, deleteStudentFromDB } from '@/lib/server/db';
import { broadcastRealtimeEvent } from '@/lib/server/events';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const result = updateStudentInDB(id, body);
    if (!result.success || !result.student) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to update student.' }, { status: 400 });
    }

    const allStudents = getAllStudents();
    broadcastRealtimeEvent({
      type: 'STUDENT_UPDATED',
      data: { student: result.student, allStudents },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, student: result.student });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const success = deleteStudentFromDB(id);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Student not found or already deleted.' }, { status: 404 });
    }

    const allStudents = getAllStudents();
    broadcastRealtimeEvent({
      type: 'STUDENT_DELETED',
      data: { id, allStudents },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
