/** Offline-safe mutation queue for mobile field work (P3-M12 architecture). */

export type OfflineMutation =
  | { id: string; type: 'item.patch'; itemId: string; patch: Record<string, unknown>; createdAt: string }
  | { id: string; type: 'comment.add'; itemId: string; body: string; createdAt: string }
  | { id: string; type: 'time.add'; itemId: string; minutes: number; workedOn: string; createdAt: string };

let memoryQueue: OfflineMutation[] = [];

export function loadQueue(): OfflineMutation[] {
  return [...memoryQueue];
}

export function saveQueue(queue: OfflineMutation[]): void {
  memoryQueue = [...queue];
}

export function enqueue(mutation: OfflineMutation): OfflineMutation[] {
  const next = [...loadQueue(), mutation];
  saveQueue(next);
  return next;
}

export function clearQueue(): void {
  saveQueue([]);
}

/**
 * Replay queued mutations when back online.
 * Stops on first failure so user can resolve conflicts without silent loss.
 */
export async function flushQueue(
  send: (mutation: OfflineMutation) => Promise<void>,
): Promise<{ flushed: number; remaining: OfflineMutation[]; error?: string }> {
  const queue = loadQueue();
  for (let i = 0; i < queue.length; i += 1) {
    const m = queue[i]!;
    try {
      await send(m);
    } catch (e) {
      const remaining = queue.slice(i);
      saveQueue(remaining);
      return {
        flushed: i,
        remaining,
        error: e instanceof Error ? e.message : 'SYNC_FAILED',
      };
    }
  }
  clearQueue();
  return { flushed: queue.length, remaining: [] };
}
