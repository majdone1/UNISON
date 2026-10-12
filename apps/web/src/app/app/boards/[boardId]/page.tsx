import { notFound, redirect } from 'next/navigation';
import { isAuthRequiredError } from '@unison/database';
import { BoardViewClient } from '@/components/board-view';
import { getServerRepo } from '@/lib/repo';

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  try {
    const bundle = await (await getServerRepo()).getBoardBundle(boardId);
    return (
      <BoardViewClient
        boardId={boardId}
        initial={{
          board: bundle.board,
          groups: bundle.groups,
          columns: bundle.columns,
          items: bundle.items,
          views: bundle.views,
          comments: bundle.comments,
          members: bundle.members,
        }}
      />
    );
  } catch (error) {
    if (isAuthRequiredError(error)) redirect('/login');
    notFound();
  }
}
