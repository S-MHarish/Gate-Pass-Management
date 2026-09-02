import { NextRequest, NextResponse } from 'next/server';
import { getAllStudents, bulkImportStudentsToDB } from '@/lib/server/db';
import { broadcastRealtimeEvent } from '@/lib/server/events';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { students, mode } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ success: false, error: 'No student data provided.' }, { status: 400 });
    }

    const result = bulkImportStudentsToDB(students, mode === 'replace' ? 'replace' : 'append');
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to import students.' }, { status: 400 });
    }

    const allStudents = getAllStudents();
    broadcastRealtimeEvent({
      type: 'STUDENTS_BATCH_SYNC',
      data: { allStudents, count: result.count },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, count: result.count, allStudents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
