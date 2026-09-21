import { AppError } from '../../../shared/errors';
import { makeCardContent, makeCardNote, type CardContent } from '../domain/card';

export type UpdatedCard = {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
  note: string | null;
  createdAt: Date;
};

/** Trường nào có mặt thì ghi đè; `note: null` là xoá ghi chú. */
type CardEdit = Partial<CardContent> & { note?: string | null };

export type CardUpdateRepository = {
  findOwnedContent(input: { userId: string; cardId: string }): Promise<CardContent | null>;
  updateOwned(input: {
    userId: string;
    cardId: string;
    content: CardEdit;
  }): Promise<UpdatedCard | null>;
};

type UpdateCardInput = {
  userId: string;
  cardId: string;
  front?: string;
  back?: string;
  note?: string | null;
};

/**
 * Hai mặt thẻ sau khi sửa. BR-025 xét cả hai mặt cùng lúc, nên request chỉ gửi
 * một mặt thì mặt kia lấy từ thẻ hiện tại — kẻo bỏ `[[...]]` khỏi một thẻ đục
 * lỗ đang trống mặt sau mà vẫn lọt. Hai request song song vẫn có thể lách qua;
 * chấp nhận, vì luật này giữ dữ liệu gọn chứ không phải ranh giới bảo mật.
 */
async function editedContent(
  deps: { cards: CardUpdateRepository },
  input: UpdateCardInput,
): Promise<CardContent> {
  if (input.front !== undefined && input.back !== undefined) {
    return { front: input.front, back: input.back };
  }

  const current = await deps.cards.findOwnedContent({
    userId: input.userId,
    cardId: input.cardId,
  });

  if (current === null) throw new AppError('ERR_CARD_NOT_FOUND');

  return { front: input.front ?? current.front, back: input.back ?? current.back };
}

export async function updateCard(
  deps: { cards: CardUpdateRepository },
  input: UpdateCardInput,
): Promise<UpdatedCard> {
  const content: CardEdit = {};

  if (input.front !== undefined || input.back !== undefined) {
    const edited = makeCardContent(await editedContent(deps, input));

    if (input.front !== undefined) content.front = edited.front;
    if (input.back !== undefined) content.back = edited.back;
  }

  // undefined là "không gửi" nên không đụng tới; null hay chuỗi trắng là xoá.
  if (input.note !== undefined) {
    content.note = makeCardNote(input.note);
  }

  if (Object.keys(content).length === 0) {
    throw new AppError('ERR_BAD_REQUEST');
  }

  const updated = await deps.cards.updateOwned({
    userId: input.userId,
    cardId: input.cardId,
    content,
  });

  if (updated === null) throw new AppError('ERR_CARD_NOT_FOUND');

  return updated;
}
