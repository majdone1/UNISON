# UNISON Realtime

## Goal
Keep board views in sync across clients without full page reloads.

## Production (Supabase Realtime)
- Channel name: `board:{boardId}` via `boardChannelName()` in `@unison/database`.
- Clients subscribe after auth; RLS ensures only org members (or private-board owners) receive events.
- Payload types: `board.revision`, `item.changed` (see `BoardChannelEvent`).

**Status:** architecture + helper shipped. Live Supabase Realtime is `BLOCKED_EXTERNAL` until project credentials exist.

## Demo fallback
When Supabase is unavailable, the web app can:

1. **Poll** `GET /api/boards/:boardId/events?since={revision}` every ~2s using `createDemoBoardPollClient()`.
2. **SSE** `GET /api/boards/:boardId/stream` for server-pushed revision bumps.

`DemoRepository.bumpBoard()` increments `boardRevisions[boardId]` on item create/update so poll/SSE clients can refresh.

## Usage (demo)

```ts
import { createDemoBoardPollClient } from '@unison/database';

const client = createDemoBoardPollClient({ intervalMs: 2000 });
const sub = client.subscribeBoard(boardId, (event) => {
  if (event.type === 'board.revision') {
    // refetch board bundle
  }
});
// later
sub.unsubscribe();
```

## Security
- Events endpoints call `assertBoardAccess` (org membership + private visibility).
- Never broadcast cross-tenant board ids; foreign board access returns 403.
