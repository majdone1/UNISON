import type { UnisonSupabaseClient } from './supabase-client';

/**
 * Board channel subscribe helper.
 *
 * Production: Supabase Realtime channel `board:{boardId}` with RLS-bound auth.
 * Demo fallback: poll `/api/boards/:boardId/events` or SSE `/api/boards/:boardId/stream`
 * using revision numbers from `DemoRepository.getBoardRevision`.
 */

export type BoardChannelEvent =
  | { type: 'board.revision'; boardId: string; revision: number }
  | { type: 'item.changed'; boardId: string; itemId: string; revision: number }
  | { type: 'heartbeat'; at: string };

export interface BoardChannelSubscription {
  boardId: string;
  unsubscribe: () => void;
}

export interface BoardChannelClient {
  /** Poll or SSE revision; resolve when a newer revision is seen (or on unsubscribe). */
  subscribeBoard(
    boardId: string,
    onEvent: (event: BoardChannelEvent) => void,
  ): BoardChannelSubscription;
}

export function boardChannelName(boardId: string): string {
  return `board:${boardId}`;
}

/** Build a demo poll URL for the web app. */
export function demoBoardPollPath(boardId: string, sinceRevision = 0): string {
  return `/api/boards/${boardId}/events?since=${sinceRevision}`;
}

/** Build a demo SSE URL for the web app. */
export function demoBoardStreamPath(boardId: string): string {
  return `/api/boards/${boardId}/stream`;
}

/**
 * Live Realtime subscription (browser or server with user JWT client).
 * Filters postgres_changes on board_items for the given board.
 */
export function createSupabaseBoardChannelClient(
  client: UnisonSupabaseClient,
): BoardChannelClient {
  return {
    subscribeBoard(boardId, onEvent) {
      const channel = client
        .channel(boardChannelName(boardId))
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'board_items',
            filter: `board_id=eq.${boardId}`,
          },
          (payload) => {
            const itemId =
              (payload.new as { id?: string } | null)?.id ??
              (payload.old as { id?: string } | null)?.id ??
              '';
            onEvent({
              type: 'item.changed',
              boardId,
              itemId,
              revision: Date.now(),
            });
          },
        )
        .subscribe();

      return {
        boardId,
        unsubscribe: () => {
          void client.removeChannel(channel);
        },
      };
    },
  };
}

/**
 * Browser-friendly poll loop (demo). Safe to call from client components.
 * Stops when `unsubscribe()` is called.
 */
export function createDemoBoardPollClient(opts?: {
  intervalMs?: number;
  fetchImpl?: typeof fetch;
}): BoardChannelClient {
  const intervalMs = opts?.intervalMs ?? 2000;
  const fetchImpl = opts?.fetchImpl ?? fetch;

  return {
    subscribeBoard(boardId, onEvent) {
      let stopped = false;
      let revision = 0;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const tick = async () => {
        if (stopped) return;
        try {
          const res = await fetchImpl(demoBoardPollPath(boardId, revision));
          if (res.ok) {
            const data = (await res.json()) as {
              revision: number;
              changed?: boolean;
            };
            if (typeof data.revision === 'number' && data.revision > revision) {
              revision = data.revision;
              onEvent({ type: 'board.revision', boardId, revision });
            }
          }
        } catch {
          // demo poll soft-fail
        }
        if (!stopped) timer = setTimeout(() => void tick(), intervalMs);
      };

      void tick();
      return {
        boardId,
        unsubscribe: () => {
          stopped = true;
          if (timer) clearTimeout(timer);
        },
      };
    },
  };
}
