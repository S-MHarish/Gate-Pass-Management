import { NextRequest, NextResponse } from 'next/server';
import { getAllStudents, createStudent } from '@/lib/server/db';
import { broadcastRealtimeEvent } from '@/lib/server/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const students = getAllStudents();
    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, roomNo, department, year, parentPhone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Student name is required.' }, { status: 400 });
    }
    if (!roomNo || !roomNo.trim()) {
      return NextResponse.json({ success: false, error: 'Room number is required.' }, { status: 400 });
    }

    const result = createStudent({
      name: name.trim(),
      roomNo: roomNo.trim(),
      department: (department || 'CSE').trim(),
      year: year || 'III',
      parentPhone: parentPhone ? parentPhone.trim() : '',
    });

    if (!result.success || !result.student) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to create student.' }, { status: 400 });
    }

    // Broadcast real-time event to all connected devices with updated sorted student list
    const allStudents = getAllStudents();
    broadcastRealtimeEvent({
      type: 'STUDENT_CREATED',
      data: { student: result.student, allStudents },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, student: result.student });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
