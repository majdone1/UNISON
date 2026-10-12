import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

/** Demo SSE stream of board revision bumps. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  try {
    const { boardId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    // Access check up front
    let last = await repo.getBoardRevision(boardId);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };
        send({ type: 'heartbeat', at: new Date().toISOString(), revision: last });
        const interval = setInterval(() => {
          void (async () => {
            try {
              const revision = await Promise.resolve(repo.getBoardRevision(boardId));
              if (revision > last) {
                last = revision;
                send({ type: 'board.revision', boardId, revision });
              } else {
                send({ type: 'heartbeat', at: new Date().toISOString(), revision });
              }
            } catch (error) {
              send({
                type: 'error',
                message: error instanceof Error ? error.message : 'UNKNOWN',
              });
              clearInterval(interval);
              controller.close();
            }
          })();
        }, 1500);
        // Auto-close after 30s in demo to avoid hanging workers
        setTimeout(() => {
          clearInterval(interval);
          controller.close();
        }, 30000);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status =
      message === 'BOARD_PRIVATE_DENIED' || message === 'CROSS_TENANT_DENIED' ? 403 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
