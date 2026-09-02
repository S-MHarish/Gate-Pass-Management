import { NextRequest, NextResponse } from 'next/server';
import { getAllGatePasses, createGatePassInDB, getAllStudents } from '@/lib/server/db';
import { broadcastRealtimeEvent } from '@/lib/server/events';
import { Student } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const passes = getAllGatePasses();
    return NextResponse.json({ success: true, passes }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching gate passes:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch gate passes' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, message: 'Invalid Content-Type. Expected application/json' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const {
      date,
      passDate,
      formattedDate,
      outTime,
      expectedInTime,
      purpose,
      passType,
      studentCount,
      students,
      studentIds,
      roomsIncluded,
      includeParentPhone,
      includeParentPhoneNumber,
      generatedBy,
      notes,
    } = body;

    let targetStudents: Student[] = [];

    if (Array.isArray(students) && students.length > 0) {
      targetStudents = students;
    } else if (Array.isArray(studentIds) && studentIds.length > 0) {
      const allDbStudents = getAllStudents();
      const idSet = new Set(studentIds);
      targetStudents = allDbStudents.filter((s) => idSet.has(s.id));
    }

    if (targetStudents.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please select at least 1 student to generate a gate pass.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const effectiveDate = date || passDate || new Date().toISOString().slice(0, 10);
    const dateObj = new Date(effectiveDate);
    const effectiveFormattedDate =
      formattedDate ||
      (!isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : effectiveDate);

    const effectiveRooms =
      roomsIncluded || Array.from(new Set(targetStudents.map((s) => s.roomNo)));

    const effectiveIncludeParentPhone = Boolean(
      includeParentPhone !== undefined ? includeParentPhone : includeParentPhoneNumber
    );

    const newPass = createGatePassInDB({
      date: effectiveDate,
      formattedDate: effectiveFormattedDate,
      outTime: outTime || '05:30 PM',
      expectedInTime: expectedInTime || '08:30 PM',
      purpose: purpose || 'General Evening Outing & Permission',
      passType: passType || 'CUSTOM',
      studentCount: studentCount || targetStudents.length,
      students: targetStudents,
      roomsIncluded: effectiveRooms,
      includeParentPhone: effectiveIncludeParentPhone,
      generatedBy: generatedBy || 'Warden (Boys Hostel-I)',
      notes: notes || undefined,
    });

    try {
      const allPasses = getAllGatePasses();
      broadcastRealtimeEvent({
        type: 'PASS_CREATED',
        data: { pass: newPass, allPasses },
        timestamp: new Date().toISOString(),
      });
    } catch (broadcastErr) {
      console.warn('Realtime broadcast skipped:', broadcastErr);
    }

    return NextResponse.json(
      {
        success: true,
        pass: newPass,
        message: 'Gate pass generated successfully',
      },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error generating gate pass:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal error generating gate pass' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
