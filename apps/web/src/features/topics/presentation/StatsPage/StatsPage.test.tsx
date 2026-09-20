import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { StatsPage } from './StatsPage';

type Reply = {
  status: number;
  body: unknown;
};

function stubForgetRateApi(...replies: Reply[]) {
  let call = 0;

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const reply = replies[Math.min(call, replies.length - 1)];
      call += 1;

      if (!reply) throw new TypeError('Thiếu phản hồi giả cho /api/topics/forget-rate');

      return {
        ok: reply.status < 400,
        status: reply.status,
        json: async () => reply.body,
      };
    }),
  );
}

const POPULATED: Reply = {
  status: 200,
  body: {
    topics: [
      { topicId: 't1', topicName: 'Kiến trúc phần mềm', forgetRate: 0.148, totalReviews: 48 },
      { topicId: 't2', topicName: 'Trí nhớ & học tập', forgetRate: 0.062, totalReviews: 52 },
    ],
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('E6-S1-T2 — Màn báo cáo thống kê', () => {
  it('liệt kê topic kèm tỷ lệ quên theo đúng thứ tự giảm dần của máy chủ', async () => {
    stubForgetRateApi(POPULATED);

    renderWithProviders(<StatsPage />, { route: '/stats' });

    const rows = await screen.findAllByRole('listitem');
    const topicRows = rows.filter((row) => row.className.includes('stats-topics__row'));

    expect(topicRows).toHaveLength(2);
    expect(topicRows[0]).toHaveTextContent('Kiến trúc phần mềm');
    expect(topicRows[0]).toHaveTextContent('Tỷ lệ quên: 14,8% • 48 lượt ôn');
    expect(topicRows[0]).toHaveTextContent('48%');
    expect(topicRows[1]).toHaveTextContent('Trí nhớ & học tập');
    expect(topicRows[1]).toHaveTextContent('Tỷ lệ quên: 6,2% • 52 lượt ôn');
  });

  it('nêu đề xuất bám nhánh có tỷ lệ quên cao nhất', async () => {
    stubForgetRateApi(POPULATED);

    renderWithProviders(<StatsPage />, { route: '/stats' });

    const advice = await screen.findByRole('note');

    expect(advice).toHaveTextContent('Đề xuất ôn tập');
    expect(advice).toHaveTextContent('Kiến trúc phần mềm');
    expect(advice).toHaveTextContent('14,8%');
  });

  it('hạ giọng đề xuất khi mọi nhánh đều dưới ngưỡng an toàn', async () => {
    stubForgetRateApi({
      status: 200,
      body: {
        topics: [{ topicId: 't1', topicName: 'Kinh tế học', forgetRate: 0.023, totalReviews: 10 }],
      },
    });

    renderWithProviders(<StatsPage />, { route: '/stats' });

    expect(await screen.findByText('Trạng thái ổn định')).toBeInTheDocument();
    expect(screen.queryByText('Đề xuất ôn tập')).not.toBeInTheDocument();
  });

  it('hiện trạng thái rỗng kèm lối tạo thẻ khi chưa có lượt ôn nào', async () => {
    stubForgetRateApi({ status: 200, body: { topics: [] } });

    renderWithProviders(<StatsPage />, { route: '/stats' });

    expect(await screen.findByText('Chưa có đủ dữ liệu ôn tập để tổng hợp')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tạo thẻ mới/ })).toHaveAttribute('href', '/cards/new');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('báo lỗi và tải lại được khi máy chủ hỏng', async () => {
    stubForgetRateApi(
      { status: 500, body: { error: { code: 'ERR_INTERNAL', message: 'Lỗi máy chủ' } } },
      POPULATED,
    );

    renderWithProviders(<StatsPage />, { route: '/stats' });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Không tải được báo cáo thống kê');

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    // Tên topic xuất hiện cả ở danh sách lẫn khối đề xuất nên phải đếm, không
    // dùng getByText đơn lẻ.
    await waitFor(() => expect(screen.getAllByText('Kiến trúc phần mềm')).toHaveLength(2));
  });
});
