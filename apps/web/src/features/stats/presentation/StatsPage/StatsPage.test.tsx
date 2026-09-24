import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewPage } from '@src/features/review/presentation/ReviewPage/ReviewPage';
import { renderWithProviders } from '@src/shared/test/renderWithProviders';
import { statsFixture, topicStats } from '@src/shared/test/stats';

import { downloadCsv } from '../../infrastructure/downloadCsv';
import { StatsPage } from './StatsPage';

vi.mock('../../infrastructure/downloadCsv', () => ({ downloadCsv: vi.fn() }));

type Reply = { status: number; body: unknown };

/** Khớp theo URL đầy đủ kể cả query; handler dạng hàm thì mỗi lần gọi trả một phản hồi. */
function mockApi(handlers: Record<string, Reply | (() => Reply)>) {
  const fetchMock = vi.fn((url: string) => {
    const route = handlers[url];
    const reply = (typeof route === 'function' ? route() : route) ?? { status: 404, body: null };
    return Promise.resolve({
      ok: reply.status < 400,
      status: reply.status,
      json: async () => reply.body,
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ARCHITECTURE = topicStats({
  topic: { id: 'topic-arch', name: 'Kiến trúc phần mềm' },
  reviews: 48,
  forgotten: 20,
  forgetRate: 0.42,
  reviewShare: 0.48,
  averageDifficulty: 6.84,
  dueCount: 0,
});
const MEMORY = topicStats({
  topic: { id: 'topic-memory', name: 'Trí nhớ & học tập' },
  reviews: 52,
  forgotten: 8,
  forgetRate: 0.148,
  reviewShare: 0.52,
  averageDifficulty: null,
  dueCount: 15,
});

const POPULATED: Reply = { status: 200, body: statsFixture({ topics: [ARCHITECTURE, MEMORY] }) };

function renderStats(route = '/stats') {
  return renderWithProviders(
    <Routes>
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/review/topic/:topicId" element={<ReviewPage source="topic" />} />
    </Routes>,
    { route },
  );
}

function statsRequests(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/api/stats'));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(downloadCsv).mockClear();
});

describe('E10-S1-T4 — TC-073 màn Thống kê đầy đủ', () => {
  it('bốn ô số liệu hiện đúng số thật của khoảng 30 ngày', async () => {
    const fetchMock = mockApi({ '/api/stats?range=30d': POPULATED });
    renderStats();

    const tiles = await screen.findByRole('region', { name: 'Chỉ số ghi nhớ' });
    const [consistency, streak, durable, recall] = within(tiles).getAllByRole('article');

    expect(consistency).toHaveTextContent('86,7%');
    expect(consistency).toHaveTextContent('26 / 30 ngày có ôn');
    expect(consistency).toHaveTextContent('Khoảng 26/08 – 24/09');
    expect(streak).toHaveTextContent('19ngày liên tiếp');
    expect(streak).toHaveTextContent('Chuỗi hiện tại: 7 ngày');
    expect(durable).toHaveTextContent('38thẻ');
    expect(durable).toHaveTextContent('Chiếm 41,8% kho thẻ (91 thẻ)');
    expect(recall).toHaveTextContent('94,2%/ 90% mục tiêu');
    expect(recall).toHaveTextContent('Nhớ 942 / 1000 lượt ôn');
    expect(recall).toHaveTextContent('vượt 4,2 điểm');

    expect(statsRequests(fetchMock)).toEqual(['/api/stats?range=30d']);
  });

  it('đổi sang "Toàn bộ thời gian" thì nạp lại theo khoảng mới', async () => {
    const fetchMock = mockApi({
      '/api/stats?range=30d': POPULATED,
      '/api/stats?range=all': {
        status: 200,
        body: statsFixture({
          range: 'all',
          period: { from: '2026-03-01', to: '2026-09-24' },
          consistency: { reviewDays: 150, totalDays: 208, rate: 150 / 208 },
        }),
      },
    });
    renderStats();

    await userEvent.click(await screen.findByRole('tab', { name: 'Toàn bộ thời gian' }));

    expect(await screen.findByText('Khoảng 01/03 – 24/09')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Toàn bộ thời gian' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(statsRequests(fetchMock)).toEqual(['/api/stats?range=30d', '/api/stats?range=all']);
  });

  it('khoảng trên URL được giữ khi mở trang, giá trị lạ về 30 ngày', async () => {
    const fetchMock = mockApi({
      '/api/stats?range=30d': POPULATED,
      '/api/stats?range=all': POPULATED,
    });
    const { unmount } = renderStats('/stats?range=all');

    expect(await screen.findByRole('tab', { name: 'Toàn bộ thời gian' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    unmount();

    renderStats('/stats?range=7d');
    expect(await screen.findByRole('tab', { name: '30 ngày gần nhất' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(statsRequests(fetchMock)).toEqual(['/api/stats?range=all', '/api/stats?range=30d']);
  });

  it('bảng nhánh giữ thứ tự máy chủ, có "Ôn ngay" khi còn thẻ đến hạn', async () => {
    mockApi({ '/api/stats?range=30d': POPULATED });
    renderStats();

    const panel = await screen.findByRole('region', { name: /Tỷ lệ quên & Độ khó/ });
    const rows = within(panel).getAllByRole('listitem');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Kiến trúc phần mềm');
    expect(rows[0]).toHaveTextContent('Tỷ lệ quên: 42% • Độ khó D: 6,8/10');
    expect(rows[0]).toHaveTextContent('48%48 lượt ôn');
    expect(rows[0]).toHaveTextContent('Không có thẻ đến hạn');
    expect(within(rows[0]!).queryByRole('link')).not.toBeInTheDocument();

    // Chưa có D trung bình thì không in "Độ khó"
    expect(rows[1]).toHaveTextContent('Tỷ lệ quên: 14,8%52%');
    expect(within(rows[1]!).getByRole('link', { name: /Ôn ngay 15 thẻ/ })).toHaveAttribute(
      'href',
      '/review/topic/topic-memory',
    );
  });

  it('đề xuất bám nhánh quên nhiều nhất trong các nhánh còn thẻ đến hạn', async () => {
    mockApi({ '/api/stats?range=30d': POPULATED });
    renderStats();

    const advice = await screen.findByRole('note');

    expect(advice).toHaveTextContent('Đề xuất ôn tập');
    expect(advice).toHaveTextContent('Trí nhớ & học tập');
    expect(advice).toHaveTextContent('(14,8%)');
    expect(advice).toHaveTextContent('15 thẻ');
    expect(advice).toHaveTextContent('Ước tính ~2 phút');
    expect(advice).not.toHaveTextContent('Kiến trúc phần mềm');
    expect(within(advice).getByRole('link', { name: /Ôn 15 thẻ ngay/ })).toHaveAttribute(
      'href',
      '/review/topic/topic-memory',
    );
  });

  it('không nhánh nào còn thẻ đến hạn thì báo ổn định, không có nút ôn', async () => {
    mockApi({
      '/api/stats?range=30d': { status: 200, body: statsFixture({ topics: [ARCHITECTURE] }) },
    });
    renderStats();

    const advice = await screen.findByRole('note');

    expect(advice).toHaveTextContent('Không nhánh nào còn thẻ đến hạn hôm nay');
    expect(within(advice).queryByRole('link')).not.toBeInTheDocument();
  });

  it('cột lượt ôn tuần này nêu ngày nhiều lượt nhất', async () => {
    mockApi({ '/api/stats?range=30d': POPULATED });
    renderStats();

    const week = await screen.findByRole('region', { name: 'Lượt ôn tuần này' });

    expect(week).toHaveTextContent('120 lượt');
    expect(week).toHaveTextContent('Thứ 5 nhiều lượt ôn nhất tuần (46 lượt).');
    expect(within(week).getAllByRole('listitem')).toHaveLength(7);
  });

  it('"Ôn ngay" mở phiên chỉ gồm thẻ của nhánh, xong thì quay về Thống kê', async () => {
    const fetchMock = mockApi({
      '/api/stats?range=30d': POPULATED,
      '/api/cards/due?topicId=topic-memory': {
        status: 200,
        body: {
          dueCount: 1,
          dueCards: [
            {
              id: 'card-1',
              front: 'Hỏi trí nhớ',
              back: 'Đáp trí nhớ',
              note: null,
              dueDate: '2026-09-24T00:00:00.000Z',
              memory: {
                stability: 0,
                difficulty: 0,
                retrievability: 0,
                lastReviewedAt: null,
                forecastDays: { remembered: 3, forgotten: 1 },
              },
            },
          ],
        },
      },
    });
    renderStats();

    const panel = await screen.findByRole('region', { name: /Tỷ lệ quên & Độ khó/ });
    await userEvent.click(within(panel).getByRole('link', { name: /Ôn ngay 15 thẻ/ }));

    expect(await screen.findByText('Hỏi trí nhớ')).toBeInTheDocument();
    expect(screen.getByText('Ôn ngay · Trí nhớ & học tập')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Kết thúc phiên/ }));

    expect(
      await screen.findByRole('heading', { name: 'Thống kê & Hiệu quả ghi nhớ' }),
    ).toBeInTheDocument();
    // Rời phiên đánh dấu số liệu cũ: vào lại màn Thống kê là nạp lại
    await waitFor(() => expect(statsRequests(fetchMock)).toHaveLength(2));
  });
});

describe('E10-S1-T4 — TC-073 trạng thái của màn Thống kê', () => {
  it('chưa ôn lần nào thì mời ôn tập hoặc tạo thẻ, không hiện bộ lọc', async () => {
    mockApi({
      '/api/stats?range=30d': {
        status: 200,
        body: statsFixture({
          consistency: { reviewDays: 0, totalDays: 30, rate: 0 },
          streak: { current: 0, longest: 0 },
          durable: { cards: 0, totalCards: 3, share: 0 },
          recall: { remembered: 0, total: 0, rate: null, target: 0.9 },
        }),
      },
    });
    renderStats();

    expect(await screen.findByText('Chưa có đủ dữ liệu ôn tập để tổng hợp')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bắt đầu ôn tập/ })).toHaveAttribute('href', '/review');
    expect(screen.getByRole('link', { name: /Tạo thẻ mới/ })).toHaveAttribute('href', '/cards/new');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xuất báo cáo CSV' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Chỉ số ghi nhớ' })).not.toBeInTheDocument();
  });

  it('30 ngày không có lượt ôn thì không hiện 0% giả và mời xem toàn bộ', async () => {
    const fetchMock = mockApi({
      '/api/stats?range=30d': {
        status: 200,
        body: statsFixture({
          consistency: { reviewDays: 0, totalDays: 30, rate: 0 },
          streak: { current: 0, longest: 4 },
          recall: { remembered: 0, total: 0, rate: null, target: 0.9 },
          topics: [],
        }),
      },
      '/api/stats?range=all': POPULATED,
    });
    renderStats();

    const tiles = await screen.findByRole('region', { name: 'Chỉ số ghi nhớ' });
    const recall = within(tiles).getAllByRole('article')[3];
    expect(recall).toHaveTextContent('—');
    expect(recall).toHaveTextContent('Chưa có lượt ôn trong khoảng này');
    // "90%" của mục tiêu vẫn được phép; cấm con số 0% đứng riêng
    expect(recall).not.toHaveTextContent(/(?<!\d)0%/);
    expect(screen.getByText('Không có lượt ôn nào trong 30 ngày gần nhất.')).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xem toàn bộ thời gian' }));

    await waitFor(() => expect(statsRequests(fetchMock)).toContain('/api/stats?range=all'));
    expect(await screen.findByRole('note')).toBeInTheDocument();
  });

  it('báo lỗi và tải lại được khi máy chủ hỏng', async () => {
    const replies: Reply[] = [
      { status: 500, body: { error: { code: 'ERR_INTERNAL', message: 'Lỗi máy chủ' } } },
      POPULATED,
    ];
    mockApi({ '/api/stats?range=30d': () => replies.shift() ?? POPULATED });
    renderStats();

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được thống kê');
    expect(screen.queryByRole('button', { name: 'Xuất báo cáo CSV' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('region', { name: 'Chỉ số ghi nhớ' })).toBeInTheDocument();
  });

  it('đang tải thì hiện khung chờ', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    renderStats();

    expect(screen.getByRole('status', { name: 'Đang tải thống kê' })).toBeInTheDocument();
  });
});

describe('E10-S1-T5 — TC-074 xuất báo cáo', () => {
  it('xuất CSV đúng khoảng đang xem, gồm cả bảng nhánh', async () => {
    const fetchMock = mockApi({ '/api/stats?range=30d': POPULATED });
    renderStats();

    await userEvent.click(await screen.findByRole('button', { name: 'Xuất báo cáo CSV' }));

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [fileName, csv] = vi.mocked(downloadCsv).mock.calls[0]!;
    expect(fileName).toBe('retainly-thong-ke-30-ngay-2026-09-24.csv');
    expect(csv).toContain('Khoảng thời gian,30 ngày gần nhất');
    expect(csv).toContain('Kiến trúc phần mềm,48,20,42,48,6.84,0');
    expect(csv).toContain('Trí nhớ & học tập,52,8,14.8,52,,15');
    // Dựng từ số liệu đã nạp, không gọi thêm API
    expect(statsRequests(fetchMock)).toEqual(['/api/stats?range=30d']);
  });

  it('đang nạp khoảng mới thì chưa cho xuất, tránh xuất nhầm số của khoảng cũ', async () => {
    mockApi({ '/api/stats?range=30d': POPULATED });
    renderStats();

    const exportButton = await screen.findByRole('button', { name: 'Xuất báo cáo CSV' });
    expect(exportButton).toBeEnabled();

    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Toàn bộ thời gian' }));

    expect(exportButton).toBeDisabled();
  });
});
