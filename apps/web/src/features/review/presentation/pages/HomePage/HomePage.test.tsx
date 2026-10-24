import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { homeOverview } from '@src/shared/test/homeOverview';
import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { HomePage } from './HomePage';

type Reply = {
  status: number;
  body: unknown;
};

const SESSION: Reply = {
  status: 200,
  body: {
    session: { userId: 'user-1', expiresAt: '2026-10-02T00:00:00.000Z', displayName: 'Toni' },
  },
};

const STATS: Reply = {
  status: 200,
  body: {
    totalCards: 38,
    dueToday: 12,
    overdue: 0,
    reviewedCards: 30,
    averageRetrievability: 0.864,
    averageStability: 12,
    masteredCards: 5,
  },
};

function stubHomeApi(routes: Record<string, Reply>) {
  const all: Record<string, Reply> = {
    '/api/session': SESSION,
    '/api/cards/stats': STATS,
    '/api/practice-sessions/overview': {
      status: 200,
      body: { activeSessionId: null, completedToday: 0, availableCount: 50 },
    },
    ...routes,
  };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const reply = all[url];

      if (!reply) throw new TypeError(`Không có route giả cho ${url}`);

      return {
        ok: reply.status < 400,
        status: reply.status,
        json: async () => reply.body,
      };
    }),
  );
}

function overviewReply(...args: Parameters<typeof homeOverview>): Reply {
  return { status: 200, body: homeOverview(...args) };
}

const topic = (name: string) => ({ id: `id-${name}`, name });

beforeEach(() => {
  // 09:00 Thứ Năm 24/09 giờ Việt Nam. Chỉ giả Date, để timer của React Query chạy thật.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-24T02:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('E10-S1-T2 — Trang chủ design 0.1.2 (TC-071)', () => {
  it('chào theo tên và hiện dải tuần T2–CN', async () => {
    stubHomeApi({
      '/api/home/overview': overviewReply({
        streak: {
          current: 7,
          longest: 12,
          week: [
            { date: '2026-09-21', reviewed: true },
            { date: '2026-09-22', reviewed: false },
            { date: '2026-09-23', reviewed: true },
            { date: '2026-09-24', reviewed: false },
            { date: '2026-09-25', reviewed: false },
            { date: '2026-09-26', reviewed: false },
            { date: '2026-09-27', reviewed: false },
          ],
        },
      }),
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Chào buổi sáng, Toni!' })).toBeVisible();
    const week = screen.getByRole('region', { name: 'Chuỗi ngày ôn tuần này' });
    expect(week).toHaveTextContent('7 ngày liền');
    expect(within(week).getByLabelText('T2: đã ôn')).toBeVisible();
    expect(within(week).getByLabelText('T3: chưa ôn')).toBeVisible();
    expect(within(week).getByLabelText('T5: hôm nay, chưa ôn')).toHaveAttribute(
      'aria-current',
      'date',
    );
    expect(within(week).getByLabelText('CN: chưa tới')).toBeVisible();
  });

  it('bài học giới hạn 15 thẻ, giữ số thẻ đến hạn và tiến độ ở phần riêng', async () => {
    stubHomeApi({
      '/api/home/overview': overviewReply({
        todayProgress: { reviewed: 3, total: 15 },
        dueByTopic: [
          { topic: topic('Kiến trúc Hexagonal'), count: 5 },
          { topic: topic('Mô hình FSRS'), count: 4 },
          { topic: topic('Distributed Systems'), count: 2 },
          { topic: null, count: 1 },
        ],
      }),
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Bài học hôm nay' })).toBeVisible();
    expect(screen.getByText(/15 thẻ · Ôn kiến thức cũ/)).toBeVisible();
    expect(
      screen.getByText('Thư viện còn 12 thẻ đến hạn; bạn có thể chia thành nhiều bài.'),
    ).toBeVisible();
    expect(screen.queryByText(/Ước tính ~/)).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiến độ hôm nay' })).toHaveAttribute(
      'aria-valuetext',
      'Đã ôn 3 trên 15 thẻ',
    );
    expect(screen.getByText('3/15 thẻ')).toBeVisible();
    expect(screen.getByRole('link', { name: /Bắt đầu bài học/ })).toHaveAttribute(
      'href',
      '/review',
    );
  });

  it('bài học không phụ thuộc việc thư viện đã gắn Topic', async () => {
    stubHomeApi({
      '/api/home/overview': overviewReply({
        todayProgress: { reviewed: 0, total: 4 },
        dueByTopic: [{ topic: null, count: 4 }],
      }),
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Bài học hôm nay' })).toBeVisible();
    expect(screen.queryByText(/^Gồm/)).not.toBeInTheDocument();
  });

  it('ba ô số liệu lấy từ tổng quan và độ nhớ trung bình của Thư viện', async () => {
    stubHomeApi({
      '/api/home/overview': overviewReply({
        library: { totalCards: 38, topicCount: 4, difficultCards: 3 },
      }),
    });

    renderWithProviders(<HomePage />);

    const list = await screen.findByLabelText('Tổng quan thư viện');
    expect(list).toHaveTextContent('Tổng thẻ38thẻThuộc 4 chủ đề');
    expect(await within(list).findByText('86%')).toBeVisible();
    expect(list).toHaveTextContent('Ước tính từ 30 thẻ đã ôn');
    expect(list).toHaveTextContent('Cần chú ý thêm3thẻNhững thẻ bạn thường trả lời chưa đúng');
    expect(within(list).getByRole('link', { name: 'Xem các thẻ này' })).toHaveAttribute(
      'href',
      '/cards?sort=difficulty',
    );
  });

  it('số liệu Thư viện lỗi thì chỉ ẩn ô tỷ lệ lưu giữ', async () => {
    stubHomeApi({
      '/api/home/overview': overviewReply(),
      '/api/cards/stats': { status: 500, body: { error: { code: 'ERR_INTERNAL', message: '' } } },
    });

    renderWithProviders(<HomePage />);

    const list = await screen.findByLabelText('Tổng quan thư viện');
    expect(list).toHaveTextContent('Tổng thẻ');
    expect(list).not.toHaveTextContent('Khả năng nhớ');
  });

  it('chu kỳ ôn kế tiếp chỉ hiện mặt hỏi, khoảng cách và lần lặp', async () => {
    stubHomeApi({
      '/api/home/overview': overviewReply({
        upcoming: [
          {
            id: 'card-1',
            front: 'Thành phần **S** trong FSRS là gì?',
            back: 'Độ ổn định',
            topic: topic('FSRS'),
            dueDate: '2026-09-27T01:00:00.000Z',
            reps: 2,
          },
        ],
      }),
    });

    renderWithProviders(<HomePage />);

    const section = await screen.findByRole('region', { name: 'Sắp tới' });
    const [card] = within(section).getAllByRole('listitem');
    expect(card).toHaveTextContent('FSRS');
    expect(card).toHaveTextContent('+3 ngày');
    expect(card).toHaveTextContent('Thành phần S trong FSRS là gì?');
    expect(card).toHaveTextContent('Lần ôn thứ 3');
    expect(card).toHaveTextContent('Ôn vào Chủ Nhật, 27/09');
    expect(card).not.toHaveTextContent('Độ ổn định');
    expect(within(section).getByRole('link', { name: /Xem lịch ôn/ })).toHaveAttribute(
      'href',
      '/cards?sort=due',
    );
  });

  it('hoàn thành một bài vẫn có thể chủ động mở bài tiếp theo', async () => {
    stubHomeApi({
      '/api/home/overview': overviewReply({ todayProgress: { reviewed: 6, total: 6 } }),
      '/api/practice-sessions/overview': {
        status: 200,
        body: { activeSessionId: null, completedToday: 1, availableCount: 12 },
      },
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByText('Đã hoàn thành bài học hôm nay')).toBeVisible();
    expect(screen.getByText('6/6 thẻ')).toBeVisible();
    expect(screen.getByRole('link', { name: /Học thêm một bài/ })).toHaveAttribute(
      'href',
      '/review',
    );
    expect(screen.getByRole('link', { name: /Tạo thẻ mới/ })).toHaveAttribute('href', '/cards/new');
    expect(screen.queryByRole('region', { name: 'Sắp tới' })).not.toBeInTheDocument();
  });

  it('chưa có thẻ nào thì mời tạo thẻ đầu tiên, không hiện số liệu', async () => {
    stubHomeApi({
      '/api/home/overview': overviewReply({
        library: { totalCards: 0, topicCount: 0, difficultCards: 0 },
      }),
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByText('Bắt đầu với thẻ đầu tiên')).toBeVisible();
    expect(screen.getByRole('link', { name: /Tạo thẻ mới/ })).toHaveAttribute('href', '/cards/new');
    expect(screen.queryByRole('link', { name: /Ôn thêm/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tổng quan thư viện')).not.toBeInTheDocument();
  });

  it('API lỗi thì hiện trạng thái thử lại thay vì số liệu giả', async () => {
    stubHomeApi({
      '/api/home/overview': {
        status: 503,
        body: { error: { code: 'ERR_INTERNAL', message: 'Máy chủ chưa sẵn sàng' } },
      },
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được trang Hôm nay');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  });
});
