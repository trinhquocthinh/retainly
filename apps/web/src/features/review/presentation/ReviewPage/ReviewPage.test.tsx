import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { ReviewPage } from './ReviewPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import { HomePage } from '../HomePage/HomePage';

type Handler = { status: number; body: unknown };

function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const handler = handlers[`${init?.method ?? 'GET'} ${url}`] ?? { status: 404, body: null };
    return Promise.resolve({
      ok: handler.status < 400,
      status: handler.status,
      json: async () => handler.body,
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const TWO_CARDS = {
  status: 200,
  body: {
    dueCount: 2,
    dueCards: [
      { id: 'card-1', front: 'Hỏi A', back: 'Đáp A', dueDate: '2026-09-13T09:00:00.000Z' },
      { id: 'card-2', front: 'Hỏi B', back: 'Đáp B', dueDate: '2026-09-13T09:00:00.000Z' },
    ],
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('E1-S3-T7 — màn ôn tập', () => {
  it('không còn thẻ đến hạn thì báo xong, không hiện thẻ nào', async () => {
    mockApi({ 'GET /api/cards/due': { status: 200, body: { dueCount: 0, dueCards: [] } } });
    renderWithProviders(<ReviewPage />);

    expect(await screen.findByText('Xong rồi!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nhớ/ })).not.toBeInTheDocument();
  });

  it('nút đánh giá bị khoá cho tới khi lật thẻ', async () => {
    mockApi({ 'GET /api/cards/due': TWO_CARDS });
    renderWithProviders(<ReviewPage />);

    expect(await screen.findByText('Hỏi A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nhớ/ })).toBeDisabled();

    await userEvent.click(screen.getByText('Hỏi A'));

    expect(screen.getByText('Đáp A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nhớ/ })).toBeEnabled();
  });

  it('đánh giá xong thì gửi đúng payload và chuyển sang thẻ kế tiếp', async () => {
    const fetchMock = mockApi({
      'GET /api/cards/due': TWO_CARDS,
      'POST /api/review-outcomes': { status: 200, body: { updatedSchedule: {} } },
    });
    renderWithProviders(<ReviewPage />);

    await userEvent.click(await screen.findByText('Hỏi A'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));

    await waitFor(() => expect(screen.getByText('Hỏi B')).toBeInTheDocument());

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({
      cardId: 'card-1',
      outcome: 'remembered',
    });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('lưu hỏng thì giữ nguyên thẻ và mời thử lại (NFR#2)', async () => {
    mockApi({
      'GET /api/cards/due': TWO_CARDS,
      'POST /api/review-outcomes': { status: 500, body: null },
    });
    renderWithProviders(<ReviewPage />);

    await userEvent.click(await screen.findByText('Hỏi A'));
    await userEvent.click(screen.getByRole('button', { name: /Quên/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Không lưu được kết quả');
    // Thẻ không được nhảy sang cái kế tiếp — đây là điều NFR#2 đòi
    expect(screen.getByText('Đáp A')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('máy chủ chết thì mời thử lại', async () => {
    mockApi({
      'GET /api/cards/due': TWO_CARDS,
      'POST /api/review-outcomes': { status: 502, body: null },
    });
    renderWithProviders(<ReviewPage />);

    await userEvent.click(await screen.findByText('Hỏi A'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));

    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('thẻ không còn tồn tại thì mời bỏ qua, không mời thử lại', async () => {
    mockApi({
      'GET /api/cards/due': TWO_CARDS,
      'POST /api/review-outcomes': {
        status: 404,
        body: { error: { code: 'ERR_CARD_NOT_FOUND', message: 'Không tìm thấy thẻ này' } },
      },
    });
    renderWithProviders(<ReviewPage />);

    await userEvent.click(await screen.findByText('Hỏi A'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));

    const skip = await screen.findByRole('button', { name: 'Bỏ qua thẻ này' });
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();

    await userEvent.click(skip);
    expect(await screen.findByText('Hỏi B')).toBeInTheDocument();
  });

  it('hoàn thành phiên thì Home tải lại due count và streak, không cần F5', async () => {
    let reviewed = false;

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/cards/due') {
        return {
          ok: true,
          status: 200,
          json: async () =>
            reviewed
              ? { dueCount: 0, dueCards: [] }
              : {
                  dueCount: 1,
                  dueCards: [
                    {
                      id: 'card-1',
                      front: 'Hỏi A',
                      back: 'Đáp A',
                      dueDate: '2026-09-20T09:00:00.000Z',
                    },
                  ],
                },
        };
      }

      if (url === '/api/review-outcomes' && init?.method === 'POST') {
        reviewed = true;

        return {
          ok: true,
          status: 200,
          json: async () => ({ updatedSchedule: {} }),
        };
      }

      if (url === '/api/streak') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ currentStreak: reviewed ? 1 : 0 }),
        };
      }

      throw new TypeError(`Không có route giả cho ${init?.method ?? 'GET'} ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/review']}>
          <Routes>
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByText('Hỏi A'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));

    await userEvent.click(await screen.findByRole('button', { name: 'Về trang chủ' }));

    expect(await screen.findByText('Bạn đã hoàn thành hôm nay')).toBeVisible();
    expect(screen.getByLabelText('Chuỗi 1 ngày')).toBeVisible();

    const dueRequests = fetchMock.mock.calls.filter(
      ([url, init]) => url === '/api/cards/due' && (init?.method ?? 'GET') === 'GET',
    );

    expect(dueRequests).toHaveLength(2);
  });
});
