import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@src/shared/test/renderWithProviders';
import { statsFixture } from '@src/shared/test/stats';

import type { CardListItem } from '../../domain/cardLibrary';
import type { LibraryStats } from '../../domain/libraryStats';
import { CardLibraryPage } from './CardLibraryPage';

const TOPIC = { id: '00000000-0000-4000-8000-0000000000a1', name: 'Trí nhớ' };
const OTHER_TOPIC = { id: '00000000-0000-4000-8000-0000000000a2', name: 'Kiến trúc' };

const CARD: CardListItem = {
  id: '00000000-0000-4000-8000-000000000001',
  sourceId: null,
  front: 'FSRS dùng để làm gì?',
  back: 'Lập lịch ôn tập theo trí nhớ.',
  note: null,
  createdAt: '2026-09-16T00:00:00.000Z',
  topic: null,
  source: null,
  schedule: {
    state: 'new',
    dueDate: '2026-09-16T00:00:00.000Z',
    stability: 0,
    difficulty: 0,
    lastReviewedAt: null,
  },
};

type FetchHandler = (url: string, options?: RequestInit) => unknown;

// Mặc định thư viện chưa có thẻ trong số liệu, nên khối số liệu không hiện và
// các ca cũ không phải biết tới nó.
const NO_STATS: LibraryStats = {
  totalCards: 0,
  dueToday: 0,
  overdue: 0,
  reviewedCards: 0,
  averageRetrievability: null,
  averageStability: null,
  masteredCards: 0,
};

function response(status: number, body: unknown) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

function libraryPayload(items: CardListItem[] = [CARD]) {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: items.length === 0 ? 0 : 1,
    },
    topicCounts: {
      all: items.length,
      unassigned: items.filter((card) => card.topic === null).length,
      topics: [TOPIC, OTHER_TOPIC].map((topic) => ({
        ...topic,
        cardCount: items.filter((card) => card.topic?.id === topic.id).length,
      })),
    },
  };
}

/**
 * Giả lập API theo URL. `library` trả thân của GET /api/cards; `write` xử lý
 * PATCH/DELETE; `stats = 'error'` làm GET /api/cards/stats trả 500. Hàng đợi,
 * số liệu và danh sách Topic có giá trị mặc định.
 */
function stubApi({
  library = () => libraryPayload(),
  write = () => ({}),
  dueCount = 0,
  stats = NO_STATS,
}: {
  library?: FetchHandler;
  write?: FetchHandler;
  dueCount?: number;
  stats?: LibraryStats | 'error';
} = {}) {
  const fetchMock = vi.fn((url: string, options?: RequestInit) => {
    if (options?.method && options.method !== 'GET') return response(200, write(url, options));
    if (url === '/api/cards/due') return response(200, { dueCount, dueCards: [] });
    if (url === '/api/cards/stats') {
      return stats === 'error' ? response(500, {}) : response(200, stats);
    }
    if (url === '/api/topics') {
      return response(200, {
        topics: [TOPIC, OTHER_TOPIC].map((topic) => ({ ...topic, createdAt: CARD.createdAt })),
      });
    }
    return response(200, library(url, options));
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function libraryCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/api/cards?'));
}

function writeCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(([, options]) => options?.method === 'PATCH');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('E3-S1-T3 — Thư viện thẻ', () => {
  it('hiển thị danh sách thật và tổng số thẻ từ API', async () => {
    const fetchMock = stubApi();

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    expect(await screen.findByText('FSRS dùng để làm gì?')).toBeVisible();
    expect(screen.getByText('1 thẻ')).toBeVisible();
    expect(libraryCalls(fetchMock)).toEqual(['/api/cards?page=1&pageSize=20']);
  });

  it('sửa hai mặt thẻ, giữ dialog mở trong lúc lỗi và đóng sau khi lưu thành công', async () => {
    let card = { ...CARD };
    const fetchMock = stubApi({
      library: () => libraryPayload([card]),
      write: (_url, options) => {
        card = { ...card, ...(JSON.parse(String(options?.body)) as object) };
        return card;
      },
    });

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    await userEvent.click(await screen.findByRole('button', { name: /Sửa thẻ/ }));

    const front = screen.getByLabelText('Mặt hỏi');
    await userEvent.clear(front);
    await userEvent.type(front, 'FSRS lập lịch dựa trên điều gì?');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu thay đổi của thẻ');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('FSRS lập lịch dựa trên điều gì?')).toBeVisible();

    // Không đổi Topic thì không gọi endpoint gán Topic.
    expect(writeCalls(fetchMock)).toHaveLength(1);
    const [url, options] = writeCalls(fetchMock)[0];
    expect(url).toBe(`/api/cards/${CARD.id}`);
    expect(JSON.parse(String(options?.body))).toEqual({
      front: 'FSRS lập lịch dựa trên điều gì?',
      back: CARD.back,
      note: '',
    });
  });

  it('chỉ xoá sau bước xác nhận và chuyển sang empty state', async () => {
    let cards = [CARD];
    const fetchMock = stubApi({
      library: () => libraryPayload(cards),
      write: () => {
        cards = [];
        return { deleted: true };
      },
    });
    const deleted = () => fetchMock.mock.calls.some(([, options]) => options?.method === 'DELETE');

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    const deleteButton = await screen.findByRole('button', { name: /Xoá thẻ/ });

    await userEvent.click(deleteButton);
    expect(screen.getByRole('alertdialog')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Giữ lại thẻ' }));
    expect(deleted()).toBe(false);

    await userEvent.click(deleteButton);
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xoá' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Đã xoá thẻ khỏi thư viện');
    expect(await screen.findByRole('heading', { name: 'Thư viện chưa có thẻ nào' })).toBeVisible();
    expect(screen.queryByRole('searchbox', { name: 'Tìm trong thư viện' })).not.toBeInTheDocument();
    await waitFor(() => expect(deleted()).toBe(true));
  });
});

describe('E7-S1-T1 — định dạng trong thư viện thẻ', () => {
  it('hiển thị đậm/code ở danh sách, còn nhãn nút và hộp xác nhận xoá dùng chữ đã gỡ dấu', async () => {
    stubApi({
      library: () =>
        libraryPayload([
          { ...CARD, front: '**FSRS** dùng `R` để làm gì?', back: 'Lập lịch *theo* trí nhớ.' },
        ]),
    });

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    expect(await screen.findByText('FSRS', { selector: 'strong' })).toBeVisible();
    expect(screen.getByText('R', { selector: 'code' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Xem đáp án' }));
    expect(screen.getByText('theo', { selector: 'em' })).toBeVisible();

    const deleteButton = screen.getByRole('button', { name: 'Xoá thẻ “FSRS dùng R để làm gì?”' });
    expect(screen.getByRole('button', { name: 'Sửa thẻ “FSRS dùng R để làm gì?”' })).toBeVisible();

    await userEvent.click(deleteButton);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('“FSRS dùng R để làm gì?”');
  });
});

describe('E7-S1-T2 — TC-055 sửa ghi chú trong thư viện thẻ', () => {
  it('chỉ đổi ghi chú cũng lưu được, xoá trắng ghi chú thì gửi chuỗi rỗng', async () => {
    const fetchMock = stubApi({
      library: () => libraryPayload([{ ...CARD, note: 'Mẹo cũ' }]),
      write: () => ({ ...CARD, note: null }),
    });

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    await userEvent.click(await screen.findByRole('button', { name: /Sửa thẻ/ }));

    const note = screen.getByLabelText(/Ghi chú/);
    const save = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(note).toHaveValue('Mẹo cũ');
    expect(save).toBeDisabled();

    await userEvent.clear(note);
    expect(save).toBeEnabled();
    await userEvent.click(save);

    await waitFor(() => expect(writeCalls(fetchMock)).toHaveLength(1));
    expect(JSON.parse(String(writeCalls(fetchMock)[0][1]?.body))).toEqual({
      front: CARD.front,
      back: CARD.back,
      note: '',
    });
  });
});

describe('E9-S1-T2 — TC-068 tìm kiếm, sắp xếp, lọc Topic trong Thư viện', () => {
  it('gõ tìm kiếm chỉ gọi API một lần sau khi ngừng gõ, Esc xoá từ khoá', async () => {
    const fetchMock = stubApi();

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    const search = await screen.findByRole('searchbox', { name: 'Tìm trong thư viện' });

    await userEvent.type(search, 'da nang');

    await waitFor(() =>
      expect(libraryCalls(fetchMock)).toContain('/api/cards?page=1&pageSize=20&q=da+nang'),
    );
    // Không có lời gọi dở dang cho từng ký tự.
    expect(libraryCalls(fetchMock)).toHaveLength(2);

    await userEvent.type(search, '{Escape}');
    expect(search).toHaveValue('');
  });

  it('⌘K và Ctrl+K đưa con trỏ vào ô tìm kiếm', async () => {
    stubApi();

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    const search = await screen.findByRole('searchbox', { name: 'Tìm trong thư viện' });

    await userEvent.keyboard('{Meta>}k{/Meta}');
    expect(search).toHaveFocus();

    search.blur();
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(search).toHaveFocus();
  });

  it('đọc bộ lọc từ URL, chip hiện số thẻ, đổi sắp xếp hay Topic đều quay về trang 1', async () => {
    const fetchMock = stubApi({
      library: () => ({
        ...libraryPayload([{ ...CARD, topic: TOPIC }]),
        pagination: { page: 2, pageSize: 20, totalItems: 25, totalPages: 2 },
      }),
    });

    renderWithProviders(<CardLibraryPage />, { route: `/cards?q=fsrs&page=2` });

    expect(await screen.findByRole('searchbox', { name: 'Tìm trong thư viện' })).toHaveValue(
      'fsrs',
    );
    expect(libraryCalls(fetchMock)[0]).toBe('/api/cards?page=2&pageSize=20&q=fsrs');

    const chips = await screen.findByRole('group', { name: 'Lọc theo nhánh kiến thức' });
    expect(within(chips).getByRole('button', { name: 'Tất cả 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(chips).getByRole('button', { name: 'Trí nhớ 1' })).toBeVisible();
    expect(within(chips).getByRole('button', { name: 'Kiến trúc 0' })).toBeVisible();
    expect(within(chips).getByRole('button', { name: 'Chưa gán 0' })).toBeVisible();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sắp xếp thẻ' }), 'due');
    await waitFor(() =>
      expect(libraryCalls(fetchMock)).toContain('/api/cards?page=1&pageSize=20&q=fsrs&sort=due'),
    );

    await userEvent.click(within(chips).getByRole('button', { name: 'Chưa gán 0' }));
    await waitFor(() =>
      expect(libraryCalls(fetchMock)).toContain(
        '/api/cards?page=1&pageSize=20&q=fsrs&sort=due&topic=none',
      ),
    );
    expect(within(chips).getByRole('button', { name: 'Chưa gán 0' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('không có thẻ khớp thì báo riêng và "Xoá bộ lọc" đưa về toàn bộ thư viện', async () => {
    const fetchMock = stubApi({
      library: (url) => libraryPayload(url.includes('q=') ? [] : [CARD]),
    });

    renderWithProviders(<CardLibraryPage />, { route: '/cards?q=kh%C3%B4ng+c%C3%B3' });

    expect(await screen.findByRole('heading', { name: 'Không có thẻ nào khớp' })).toBeVisible();
    expect(screen.getByText('0 kết quả')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }));

    expect(await screen.findByText('FSRS dùng để làm gì?')).toBeVisible();
    expect(screen.getByRole('searchbox', { name: 'Tìm trong thư viện' })).toHaveValue('');
    expect(libraryCalls(fetchMock).at(-1)).toBe('/api/cards?page=1&pageSize=20');
  });

  it('thẻ hiện Topic, nguồn, badge hạn ôn và S/D; thẻ mới ghi "Chưa ôn lần nào"', async () => {
    stubApi({
      dueCount: 3,
      library: () =>
        libraryPayload([
          {
            ...CARD,
            id: '00000000-0000-4000-8000-000000000002',
            front: 'Thẻ đã ôn',
            topic: TOPIC,
            source: { id: '00000000-0000-4000-8000-0000000000b1', title: 'Bài viết FSRS' },
            schedule: {
              state: 'review',
              dueDate: '2020-01-01T00:00:00.000Z',
              stability: 14.23,
              difficulty: 3.2,
              lastReviewedAt: '2019-12-20T00:00:00.000Z',
            },
          },
          CARD,
        ]),
    });

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    const reviewed = (await screen.findByText('Thẻ đã ôn')).closest('article')!;
    expect(within(reviewed).getByText('Trí nhớ')).toBeVisible();
    expect(within(reviewed).getByText('Nguồn: Bài viết FSRS')).toBeVisible();
    expect(within(reviewed).getByText(/^Quá hạn \d+ ngày$/)).toBeVisible();
    expect(within(reviewed).getByText(/14,2 ngày/)).toBeVisible();
    expect(within(reviewed).getByText(/3,2/)).toBeVisible();

    const fresh = screen.getByText('FSRS dùng để làm gì?').closest('article')!;
    expect(within(fresh).getByText('Chưa gán')).toBeVisible();
    expect(within(fresh).getByText('Thẻ mới')).toBeVisible();
    expect(within(fresh).getByText('Chưa ôn lần nào')).toBeVisible();

    expect(screen.getByRole('link', { name: 'Ôn ngay (3 đến hạn)' })).toHaveAttribute(
      'href',
      '/review',
    );
  });

  it('đáp án ẩn cho tới khi bấm Xem đáp án, kèm cả ghi chú', async () => {
    stubApi({ library: () => libraryPayload([{ ...CARD, note: 'Nhớ #fsrs' }]) });

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    const reveal = await screen.findByRole('button', { name: 'Xem đáp án' });
    expect(screen.getByText(CARD.back)).not.toBeVisible();
    expect(reveal).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(reveal);

    expect(screen.getByText(CARD.back)).toBeVisible();
    expect(screen.getByText('Nhớ #fsrs')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ẩn đáp án' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('đổi Topic khi sửa thẻ chỉ gọi endpoint gán Topic; chọn "Chưa phân nhánh" gửi null', async () => {
    const fetchMock = stubApi({
      library: () => libraryPayload([{ ...CARD, topic: TOPIC }]),
      write: () => ({ ...CARD, topicId: OTHER_TOPIC.id }),
    });

    const { queryClient } = renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    // Màn Thống kê đã nạp trước đó; đổi nhánh phải đánh dấu số liệu theo Topic là cũ.
    queryClient.setQueryData(['stats', '30d'], statsFixture());
    await userEvent.click(await screen.findByRole('button', { name: /Sửa thẻ/ }));

    const topicSelect = screen.getByRole('combobox', { name: 'Nhánh kiến thức' });
    await waitFor(() => expect(topicSelect).toHaveValue(TOPIC.id));
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();

    await userEvent.selectOptions(topicSelect, OTHER_TOPIC.id);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu thay đổi của thẻ');
    expect(writeCalls(fetchMock).map(([url, options]) => [url, options?.body])).toEqual([
      [`/api/cards/${CARD.id}/topic`, JSON.stringify({ topicId: OTHER_TOPIC.id })],
    ]);
    expect(queryClient.getQueryState(['stats', '30d'])?.isInvalidated).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: /Sửa thẻ/ }));
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Nhánh kiến thức' }),
      'Chưa phân nhánh',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(writeCalls(fetchMock)).toHaveLength(2));
    expect(writeCalls(fetchMock)[1][1]?.body).toBe(JSON.stringify({ topicId: null }));
  });
});

/** jsdom không có `matchMedia`; giả lập màn hình desktop (≥ 1024px). */
function stubDesktop() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(min-width: 1024px)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('E9-S1-T3 — TC-069 ô số liệu Thư viện', () => {
  it('hiện cần ôn kèm quá hạn, độ nhớ và S trung bình, tỷ lệ đã thuộc', async () => {
    stubApi({
      stats: {
        totalCards: 5,
        dueToday: 3,
        overdue: 1,
        reviewedCards: 4,
        averageRetrievability: 0.914,
        averageStability: 18.64,
        masteredCards: 2,
      },
    });

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    const stats = await screen.findByLabelText('Số liệu thư viện');
    expect(stats).toHaveTextContent('Cần ôn hôm nay3thẻTrong đó 1 quá hạn');
    expect(stats).toHaveTextContent('Độ nhớ trung bình91%Trên 4 thẻ đã ôn');
    expect(stats).toHaveTextContent('Độ ổn định (S)18,6 ngàyTrên 4 thẻ đã ôn');
    expect(stats).toHaveTextContent('Đã thuộc2/ 5 thẻ40% · S trên 30 ngày');
  });

  it('chưa ôn thẻ nào thì độ nhớ và S hiện "—", không báo quá hạn', async () => {
    stubApi({ stats: { ...NO_STATS, totalCards: 1, dueToday: 1 } });

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    const stats = await screen.findByLabelText('Số liệu thư viện');
    expect(stats).toHaveTextContent('Cần ôn hôm nay1thẻKhông có thẻ quá hạn');
    expect(stats).toHaveTextContent('Độ nhớ trung bình—Chưa ôn thẻ nào');
    expect(stats).toHaveTextContent('Độ ổn định (S)—Chưa ôn thẻ nào');
    expect(stats).toHaveTextContent('Đã thuộc0/ 1 thẻ0% · S trên 30 ngày');
  });

  it('không tải được số liệu thì ẩn khối số liệu, danh sách thẻ vẫn dùng được', async () => {
    stubApi({ stats: 'error' });

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    expect(await screen.findByText('FSRS dùng để làm gì?')).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByLabelText('Số liệu thư viện')).not.toBeInTheDocument(),
    );
  });

  it('xoá thẻ thì nạp lại số liệu Thư viện và đánh dấu Thống kê là cũ', async () => {
    const fetchMock = stubApi({
      stats: { ...NO_STATS, totalCards: 1, dueToday: 1 },
      write: () => ({ deleted: true }),
    });
    const statsCalls = () =>
      fetchMock.mock.calls.filter(([url]) => url === '/api/cards/stats').length;

    const { queryClient } = renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    queryClient.setQueryData(['stats', 'all'], statsFixture({ range: 'all' }));
    await screen.findByLabelText('Số liệu thư viện');
    expect(statsCalls()).toBe(1);

    await userEvent.click(screen.getByRole('button', { name: /Xoá thẻ/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xoá' }));

    await waitFor(() => expect(statsCalls()).toBe(2));

    expect(queryClient.getQueryState(['stats', 'all'])?.isInvalidated).toBe(true);
  });
});

describe('E9-S1-T2b — TC-068 kiểu xem Lưới / Bảng', () => {
  it('mobile và tablet chỉ có Lưới, kể cả khi đã lưu chọn Bảng trên desktop', async () => {
    window.localStorage.setItem('retainly:library-layout', 'table');
    stubApi();

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    expect(await screen.findByRole('article')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Kiểu hiển thị' })).not.toBeInTheDocument();
  });

  it('desktop chuyển sang Bảng và nhớ lựa chọn cho lần mở sau', async () => {
    stubDesktop();
    stubApi();

    const first = renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    expect(await screen.findByRole('article')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Xem dạng lưới' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Xem dạng bảng' }));

    expect(screen.getByRole('table')).toBeVisible();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('retainly:library-layout')).toBe('table');

    first.unmount();
    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    expect(await screen.findByRole('table')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Xem dạng bảng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('Bảng: bấm mặt hỏi mở đáp án, thẻ chưa ôn để trống S/D, vẫn sửa được', async () => {
    window.localStorage.setItem('retainly:library-layout', 'table');
    stubDesktop();
    stubApi({ library: () => libraryPayload([{ ...CARD, note: 'Nhớ #fsrs' }]) });

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    const toggle = await screen.findByRole('button', { name: CARD.front });
    const row = toggle.closest('tr')!;
    expect(within(row).getByText('Chưa gán')).toBeVisible();
    expect(within(row).getByText('Thẻ mới')).toBeVisible();
    expect(within(row).getAllByText('—')).toHaveLength(2);
    expect(screen.getByText(CARD.back)).not.toBeVisible();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(CARD.back)).toBeVisible();
    expect(screen.getByText('Nhớ #fsrs')).toBeVisible();

    await userEvent.click(within(row).getByRole('button', { name: /Sửa thẻ/ }));
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('trình duyệt chặn localStorage thì vẫn mở Lưới và vẫn đổi được kiểu xem', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    stubDesktop();
    stubApi();

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    expect(await screen.findByRole('article')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Xem dạng bảng' }));
    expect(screen.getByRole('table')).toBeVisible();
  });
});
