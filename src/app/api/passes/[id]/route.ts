import { NextRequest, NextResponse } from 'next/server';
import { getAllGatePasses, deleteGatePassFromDB } from '@/lib/server/db';
import { broadcastRealtimeEvent } from '@/lib/server/events';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const success = deleteGatePassFromDB(id);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Gate pass record not found or already deleted.' }, { status: 404 });
    }

    const allPasses = getAllGatePasses();
    broadcastRealtimeEvent({
      type: 'PASS_DELETED',
      data: { id, allPasses },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
