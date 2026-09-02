import { RealtimeEventPayload } from '@/types';

type SSEController = ReadableStreamDefaultController<Uint8Array>;

interface ActiveClient {
  id: string;
  controller: SSEController;
}

// Global registry for active SSE clients across hot-reloads in Node runtime
const globalClientsKey = Symbol.for('vsb_realtime_clients');
const globalHeartbeatKey = Symbol.for('vsb_realtime_heartbeat');

const globalObject = globalThis as unknown as {
  [globalClientsKey]?: Map<string, ActiveClient>;
  [globalHeartbeatKey]?: NodeJS.Timeout;
};

if (!globalObject[globalClientsKey]) {
  globalObject[globalClientsKey] = new Map<string, ActiveClient>();
}

const activeClients: Map<string, ActiveClient> = globalObject[globalClientsKey]!;

const encoder = new TextEncoder();

export function registerRealtimeClient(id: string, controller: SSEController) {
  activeClients.set(id, { id, controller });

  // Start heartbeat if not running
  if (!globalObject[globalHeartbeatKey]) {
    globalObject[globalHeartbeatKey] = setInterval(() => {
      broadcastRealtimeEvent({
        type: 'PING',
        timestamp: new Date().toISOString(),
      });
    }, 15000);
  }
}

export function unregisterRealtimeClient(id: string) {
  activeClients.delete(id);
}

export function broadcastRealtimeEvent<T = unknown>(event: RealtimeEventPayload<T>) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const encoded = encoder.encode(payload);

  const deadClientIds: string[] = [];

  activeClients.forEach((client, id) => {
    try {
      client.controller.enqueue(encoded);
    } catch {
      deadClientIds.push(id);
    }
  });

  for (let i = 0; i < deadClientIds.length; i++) {
    activeClients.delete(deadClientIds[i]);
  }
}

export function getActiveClientCount(): number {
  return activeClients.size;
}
