import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@src/shared/ui/Button/Button';
import {
  IconArrowLeft,
  IconArrowRight,
  IconDelete,
  IconEdit,
  IconLibrary,
  IconNewCard,
} from '@src/shared/ui/Icons/Icons';
import { Toast } from '@src/shared/ui/Toast/Toast';
import { InlineMarkdown } from '@src/shared/ui/Markdown/InlineMarkdown';

import { useCardLibrary } from '../../application/useCardLibrary';
import type { CardListItem, UpdateCardInput } from '../../domain/cardLibrary';
import { deleteCard, fetchCards, updateCard } from '../../infrastructure/cardsApi';
import { DeleteCardDialog } from './DeleteCardDialog';
import { EditCardDialog } from './EditCardDialog';

import './CardLibraryPage.css';
import { stripMarkdown } from '@src/shared/ui/Markdown/MarkdownSyntax';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatCreatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Không rõ' : dateFormatter.format(date);
}

function LoadingRows() {
  return (
    <div
      className="card-library__skeleton surface-panel surface-panel--flush"
      role="status"
      aria-label="Đang tải thư viện thẻ"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div className="card-library__skeleton-row" key={index}>
          <span className="card-library__skeleton-line card-library__skeleton-line--strong" />
          <span className="card-library__skeleton-line" />
        </div>
      ))}
    </div>
  );
}

export function CardLibraryPage() {
  const library = useCardLibrary({ fetchCards, updateCard, deleteCard });
  const [editingCard, setEditingCard] = useState<CardListItem | null>(null);
  const [deletingCard, setDeletingCard] = useState<CardListItem | null>(null);
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);

  const cards = library.data?.items ?? [];
  const pagination = library.data?.pagination;

  function announce(message: string) {
    setNotice({ id: Date.now(), message });
  }

  function openEdit(card: CardListItem) {
    library.resetUpdate();
    setEditingCard(card);
  }

  function openDelete(card: CardListItem) {
    library.resetDelete();
    setDeletingCard(card);
  }

  async function saveEdit(input: UpdateCardInput) {
    if (!editingCard) return;

    try {
      await library.saveCard(editingCard.id, input);
      setEditingCard(null);
      announce('Đã lưu thay đổi của thẻ');
    } catch {
      // Mutation giữ lỗi để dialog hiển thị đúng vị trí; không đóng dialog.
    }
  }

  async function confirmDelete() {
    if (!deletingCard) return;

    try {
      await library.removeCard(deletingCard.id);
      setDeletingCard(null);
      announce('Đã xoá thẻ khỏi thư viện');
    } catch {
      // Mutation giữ lỗi để dialog cho phép người dùng thử lại hoặc huỷ.
    }
  }

  const firstItem = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastItem = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.totalItems)
    : 0;

  return (
    <div className="card-library" aria-busy={library.refreshing}>
      <header className="card-library__intro">
        <div>
          <div className="card-library__heading-row">
            <h1 className="text-h1">Thư viện thẻ</h1>
            {pagination ? (
              <span className="card-library__count text-caption">{pagination.totalItems} thẻ</span>
            ) : null}
          </div>
          <p className="card-library__description text-small">
            Xem lại nội dung, chỉnh sửa lỗi và loại bỏ những thẻ không còn cần thiết.
          </p>
        </div>

        <Link className="card-library__create btn btn--primary" to="/cards/new">
          <IconNewCard />
          Tạo thẻ mới
        </Link>
      </header>

      {library.loading ? <LoadingRows /> : null}

      {!library.loading && library.loadError ? (
        <section className="card-library__load-error feedback-danger" role="alert">
          <div>
            <h2 className="text-small">Không tải được thư viện thẻ</h2>
            <p className="text-caption">Kiểm tra kết nối rồi thử lại.</p>
          </div>
          <Button onClick={library.reload}>Thử lại</Button>
        </section>
      ) : null}

      {!library.loading && !library.loadError && pagination?.totalItems === 0 ? (
        <section className="card-library__empty surface-panel">
          <span className="card-library__empty-icon" aria-hidden="true">
            <IconLibrary size={28} />
          </span>
          <h2 className="text-h2">Thư viện chưa có thẻ nào</h2>
          <p className="text-small">Tạo thẻ đầu tiên để bắt đầu xây dựng kho kiến thức của bạn.</p>
          <Link className="card-library__create btn btn--primary" to="/cards/new">
            <IconNewCard />
            Tạo thẻ đầu tiên
          </Link>
        </section>
      ) : null}

      {!library.loading && !library.loadError && cards.length > 0 ? (
        <section
          className="card-library__panel surface-panel surface-panel--flush"
          aria-label="Danh sách thẻ"
        >
          <div className="card-library__table-header text-caption-caps" aria-hidden="true">
            <span>Mặt hỏi &amp; đáp án tóm lược</span>
            <span>Ngày tạo</span>
            <span className="card-library__actions-heading">Thao tác</span>
          </div>

          <div className="card-library__rows">
            {cards.map((card) => (
              <article className="card-library__row" key={card.id}>
                <button
                  type="button"
                  className="card-library__content"
                  onClick={() => openEdit(card)}
                >
                  <span className="card-library__front">
                    <InlineMarkdown text={card.front} />
                  </span>
                  {card.back ? (
                    <span className="card-library__back text-caption">
                      <InlineMarkdown text={card.back} />
                    </span>
                  ) : null}
                </button>

                <time className="card-library__date text-caption" dateTime={card.createdAt}>
                  <span className="card-library__mobile-label">Ngày tạo: </span>
                  {formatCreatedAt(card.createdAt)}
                </time>

                <div className="card-library__row-actions">
                  <button
                    type="button"
                    className="card-library__icon-button"
                    aria-label={`Sửa thẻ “${stripMarkdown(card.front)}”`}
                    onClick={() => openEdit(card)}
                  >
                    <IconEdit />
                  </button>
                  <button
                    type="button"
                    className="card-library__icon-button card-library__icon-button--danger"
                    aria-label={`Xoá thẻ “${stripMarkdown(card.front)}”`}
                    onClick={() => openDelete(card)}
                  >
                    <IconDelete />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <footer className="card-library__pagination">
              <p className="text-caption">
                Hiển thị {firstItem}–{lastItem} trong {pagination.totalItems} thẻ
              </p>
              <div className="card-library__page-actions">
                <Button
                  disabled={pagination.page <= 1 || library.refreshing}
                  onClick={() => library.goToPage(pagination.page - 1)}
                >
                  <IconArrowLeft />
                  Trước
                </Button>
                <span className="text-caption" aria-label={`Trang ${pagination.page}`}>
                  {pagination.page}/{pagination.totalPages}
                </span>
                <Button
                  disabled={pagination.page >= pagination.totalPages || library.refreshing}
                  onClick={() => library.goToPage(pagination.page + 1)}
                >
                  Sau
                  <IconArrowRight />
                </Button>
              </div>
            </footer>
          ) : null}
        </section>
      ) : null}

      {editingCard ? (
        <EditCardDialog
          card={editingCard}
          saving={library.updating}
          error={library.updateError}
          onCancel={() => setEditingCard(null)}
          onSave={saveEdit}
        />
      ) : null}

      {deletingCard ? (
        <DeleteCardDialog
          card={deletingCard}
          deleting={library.deleting}
          error={library.deleteError}
          onCancel={() => setDeletingCard(null)}
          onConfirm={confirmDelete}
        />
      ) : null}

      <Toast key={notice?.id} open={notice !== null}>
        {notice?.message}
      </Toast>
    </div>
  );
}
