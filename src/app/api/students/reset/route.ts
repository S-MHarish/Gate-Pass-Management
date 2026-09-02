import { NextResponse } from 'next/server';
import { resetStudentsToDefaultDB } from '@/lib/server/db';
import { broadcastRealtimeEvent } from '@/lib/server/events';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const allStudents = resetStudentsToDefaultDB();

    broadcastRealtimeEvent({
      type: 'STUDENTS_BATCH_SYNC',
      data: { allStudents, count: allStudents.length },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, count: allStudents.length, allStudents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
