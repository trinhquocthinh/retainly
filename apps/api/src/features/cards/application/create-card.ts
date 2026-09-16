import { makeCardContent } from '../domain/card';
import { createInitialSchedule, type Schedule } from '../../review/domain/review-scheduler';
import { AppError } from '../../../shared/errors';

type NewCard = {
  userId: string;
  sourceId?: string;
  front: string;
  back: string;
  schedule: Schedule;
};
export type CreatedCard = NewCard & { id: string; createdAt: Date };

/** Cổng lưu trữ thẻ. Hiện thực thật nằm ở tầng infrastructure. */
export type CardRepository = {
  create(card: NewCard): Promise<CreatedCard>;
};

/** Cổng kiểm tra quyền sở hữu nguồn: thẻ chỉ được nối vào nguồn của chính chủ (BR-002). */
export type SourceOwnership = {
  belongsToUser(input: { userId: string; sourceId: string }): Promise<boolean>;
};

export async function createCard(
  deps: { cards: CardRepository; sources: SourceOwnership; now: () => Date },
  input: { userId: string; sourceId?: string; front: string; back: string },
): Promise<CreatedCard> {
  const content = makeCardContent(input);

  // Nguồn của user khác phải trả 404 y như nguồn không tồn tại: báo 403 là đã
  // vô tình xác nhận nguồn đó có thật (BR-002).
  if (input.sourceId !== undefined) {
    const owned = await deps.sources.belongsToUser({
      userId: input.userId,
      sourceId: input.sourceId,
    });
    if (!owned) throw new AppError('ERR_SOURCE_NOT_FOUND');
  }

  return deps.cards.create({
    userId: input.userId,
    sourceId: input.sourceId,
    ...content,
    schedule: createInitialSchedule(deps.now()),
  });
}
