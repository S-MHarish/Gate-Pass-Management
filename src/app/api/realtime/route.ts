import { NextRequest } from 'next/server';
import { registerRealtimeClient, unregisterRealtimeClient } from '@/lib/server/events';
import { getAllStudents, getAllGatePasses, getHostelSettingsFromDB } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      registerRealtimeClient(clientId, controller);

      // Send immediate initial sync payload
      try {
        const students = getAllStudents();
        const passes = getAllGatePasses();
        const hostelInfo = getHostelSettingsFromDB();

        const initialPayload = `data: ${JSON.stringify({
          type: 'INIT_SYNC',
          data: { students, passes, hostelInfo },
          timestamp: new Date().toISOString(),
        })}\n\n`;

        controller.enqueue(encoder.encode(initialPayload));
      } catch (err) {
        console.error('Error sending initial realtime sync:', err);
      }
    },
    cancel() {
      unregisterRealtimeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
