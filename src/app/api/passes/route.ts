import { NextRequest, NextResponse } from 'next/server';
import { getAllGatePasses, createGatePassInDB } from '@/lib/server/db';
import { broadcastRealtimeEvent } from '@/lib/server/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const passes = getAllGatePasses();
    return NextResponse.json({ success: true, passes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      formattedDate,
      outTime,
      expectedInTime,
      purpose,
      passType,
      studentCount,
      students,
      roomsIncluded,
      includeParentPhone,
      generatedBy,
      notes,
    } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one student must be selected.' }, { status: 400 });
    }

    const newPass = createGatePassInDB({
      date: date || new Date().toISOString().slice(0, 10),
      formattedDate: formattedDate || date,
      outTime: outTime || '05:30 PM',
      expectedInTime: expectedInTime || '08:30 PM',
      purpose: purpose || 'General Outing',
      passType: passType || 'CUSTOM',
      studentCount: studentCount || students.length,
      students,
      roomsIncluded: roomsIncluded || Array.from(new Set(students.map((s: any) => s.roomNo))),
      includeParentPhone: Boolean(includeParentPhone),
      generatedBy: generatedBy || 'Warden (Boys Hostel-I)',
      notes: notes || undefined,
    });

    const allPasses = getAllGatePasses();
    broadcastRealtimeEvent({
      type: 'PASS_CREATED',
      data: { pass: newPass, allPasses },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, pass: newPass });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
