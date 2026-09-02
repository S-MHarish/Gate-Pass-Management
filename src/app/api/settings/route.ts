import { NextRequest, NextResponse } from 'next/server';
import { getHostelSettingsFromDB, updateHostelSettingsInDB } from '@/lib/server/db';
import { broadcastRealtimeEvent } from '@/lib/server/events';
import { HostelInfo } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const info = getHostelSettingsFromDB();
    return NextResponse.json({ success: true, hostelInfo: info });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HostelInfo;
    const updated = updateHostelSettingsInDB(body);

    broadcastRealtimeEvent({
      type: 'SETTINGS_UPDATED',
      data: { hostelInfo: updated },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, hostelInfo: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
