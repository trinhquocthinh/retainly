import { useState } from 'react';
import { Link } from 'react-router';

import { useDueCount } from '@src/features/review/application/useDueCount';
import { fetchDueCards } from '@src/features/review/infrastructure/reviewApi';
import { Button } from '@src/shared/ui/Button/Button';
import {
  IconArrowLeft,
  IconArrowRight,
  IconLibrary,
  IconNewCard,
  IconSearch,
} from '@src/shared/ui/Icons/Icons';
import { Toast } from '@src/shared/ui/Toast/Toast';

import { useCardLibrary } from '../../../application/useCardLibrary';
import { useLibraryStats } from '../../../application/useLibraryStats';
import { LibraryTable } from '../../components/LibraryTable/LibraryTable';
import { useLibraryFilters } from '../../../application/useLibraryFilters';
import { isFiltering, type CardEdit, type CardListItem } from '../../../domain/cardLibrary';
import {
  assignCardTopic,
  deleteCard,
  fetchCards,
  fetchLibraryStats,
  updateCard,
} from '../../../infrastructure/cardsApi';
import { DeleteCardDialog } from '../../components/DeleteCardDialog/DeleteCardDialog';
import { EditCardDialog } from '../../components/EditCardDialog/EditCardDialog';
import { LibraryCard } from '../../components/LibraryCard/LibraryCard';
import { LibraryStats } from '../../components/LibraryStats/LibraryStats';
import { LibraryToolbar } from '../../components/LibraryToolbar/LibraryToolbar';

import './CardLibraryPage.css';
import { useLibraryLayout } from '../../../application/useLibraryLayout';

function LoadingGrid() {
  return (
    <div className="card-library__grid" role="status" aria-label="Đang tải thư viện thẻ">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="card-library__skeleton surface-panel" key={index}>
          <span className="card-library__skeleton-line card-library__skeleton-line--short" />
          <span className="card-library__skeleton-line card-library__skeleton-line--strong" />
          <span className="card-library__skeleton-line" />
        </div>
      ))}
    </div>
  );
}

export function CardLibraryPage() {
  const view = useLibraryFilters();
  const { filters } = view;
  const library = useCardLibrary({ fetchCards, updateCard, assignCardTopic, deleteCard }, view);
  const dueCount = useDueCount(fetchDueCards);
  const libraryStats = useLibraryStats(fetchLibraryStats);
  const layout = useLibraryLayout();
  // Mốc "hôm nay" cho badge hạn ôn, chốt lúc mở trang như hàng đợi ôn.
  const [now] = useState(() => new Date());
  const [editingCard, setEditingCard] = useState<CardListItem | null>(null);
  const [deletingCard, setDeletingCard] = useState<CardListItem | null>(null);
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);

  const cards = library.data?.items ?? [];
  const pagination = library.data?.pagination;
  const filtering = isFiltering(filters);
  const ready = !library.loading && !library.loadError;
  const libraryEmpty = ready && pagination?.totalItems === 0 && !filtering;
  const noMatch = ready && pagination?.totalItems === 0 && filtering;

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

  async function saveEdit(edit: CardEdit) {
    if (!editingCard) return;

    try {
      await library.saveCard(editingCard.id, edit);
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
              <span className="card-library__count text-caption">
                {pagination.totalItems} {filtering ? 'kết quả' : 'thẻ'}
              </span>
            ) : null}
          </div>
          <p className="card-library__description text-small">
            Tìm lại kiến thức, xem độ nhớ của từng thẻ và dọn những thẻ không còn cần.
          </p>
        </div>

        <div className="card-library__header-actions">
          {dueCount > 0 ? (
            <Link className="link-button link-button--outline" to="/review">
              Ôn ngay ({dueCount} đến hạn)
            </Link>
          ) : null}
          <Link className="link-button link-button--accent" to="/cards/new">
            <IconNewCard />
            Tạo thẻ mới
          </Link>
        </div>
      </header>

      {!libraryEmpty && !libraryStats.failed ? (
        <LibraryStats stats={libraryStats.stats} loading={libraryStats.loading} />
      ) : null}

      {!libraryEmpty ? (
        <LibraryToolbar
          query={filters.q}
          sort={filters.sort}
          topic={filters.topic}
          counts={library.data?.topicCounts}
          layout={layout.canChoose ? { value: layout.layout, onChange: layout.choose } : undefined}
          onQueryChange={view.setQuery}
          onSortChange={view.setSort}
          onTopicChange={view.setTopic}
        />
      ) : null}

      {library.loading ? <LoadingGrid /> : null}

      {!library.loading && library.loadError ? (
        <section className="card-library__load-error feedback-danger" role="alert">
          <div>
            <h2 className="text-small">Không tải được thư viện thẻ</h2>
            <p className="text-caption">Kiểm tra kết nối rồi thử lại.</p>
          </div>
          <Button onClick={library.reload}>Thử lại</Button>
        </section>
      ) : null}

      {libraryEmpty ? (
        <section className="card-library__empty surface-panel">
          <span className="card-library__empty-icon" aria-hidden="true">
            <IconLibrary size={28} />
          </span>
          <h2 className="text-h2">Thư viện chưa có thẻ nào</h2>
          <p className="text-small">Tạo thẻ đầu tiên để bắt đầu xây dựng kho kiến thức của bạn.</p>
          <Link className="link-button link-button--accent" to="/cards/new">
            <IconNewCard />
            Tạo thẻ đầu tiên
          </Link>
        </section>
      ) : null}

      {noMatch ? (
        <section className="card-library__empty surface-panel">
          <span className="card-library__empty-icon" aria-hidden="true">
            <IconSearch size={28} />
          </span>
          <h2 className="text-h2">Không có thẻ nào khớp</h2>
          <p className="text-small">Thử từ khoá khác, hoặc bỏ bộ lọc để xem toàn bộ thư viện.</p>
          <Button onClick={view.clearFilters}>Xoá bộ lọc</Button>
        </section>
      ) : null}

      {ready && cards.length > 0 ? (
        <section aria-label="Danh sách thẻ">
          <div className={library.refreshing ? 'card-library__refreshing' : undefined}>
            {layout.layout === 'table' ? (
              <LibraryTable cards={cards} now={now} onEdit={openEdit} onDelete={openDelete} />
            ) : (
              <div className="card-library__grid">
                {cards.map((card) => (
                  <LibraryCard
                    key={card.id}
                    card={card}
                    now={now}
                    onEdit={() => openEdit(card)}
                    onDelete={() => openDelete(card)}
                  />
                ))}
              </div>
            )}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <footer className="card-library__pagination">
              <p className="text-caption">
                Hiển thị {firstItem}–{lastItem} trong {pagination.totalItems} thẻ
              </p>
              <div className="card-library__page-actions">
                <Button
                  disabled={pagination.page <= 1 || library.refreshing}
                  onClick={() => view.goToPage(pagination.page - 1)}
                >
                  <IconArrowLeft />
                  Trước
                </Button>
                <span className="text-caption" aria-label={`Trang ${pagination.page}`}>
                  {pagination.page}/{pagination.totalPages}
                </span>
                <Button
                  disabled={pagination.page >= pagination.totalPages || library.refreshing}
                  onClick={() => view.goToPage(pagination.page + 1)}
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
