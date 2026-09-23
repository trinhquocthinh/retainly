import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { ReviewPage } from './ReviewPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import { HomePage } from '../HomePage/HomePage';

type Handler = { status: number; body: unknown };

/** Handler dạng hàm thì mỗi lần gọi trả một phản hồi khác nhau. */
function mockApi(handlers: Record<string, Handler | (() => Handler)>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const route = handlers[`${init?.method ?? 'GET'} ${url}`];
    const handler = (typeof route === 'function' ? route() : route) ?? { status: 404, body: null };
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

describe('E7-S1-T2 — TC-056 ghi chú ở mặt đáp án', () => {
  function dueWith(note: string | null): Handler {
    return {
      status: 200,
      body: {
        dueCount: 1,
        dueCards: [
          {
            id: 'card-1',
            front: 'Hỏi A',
            back: 'Đáp A',
            note,
            dueDate: '2026-09-13T09:00:00.000Z',
          },
        ],
      },
    };
  }

  it('hiện ghi chú đã định dạng dưới đáp án', async () => {
    mockApi({ 'GET /api/cards/due': dueWith('Mẹo: nhớ **từ khoá**') });
    renderWithProviders(<ReviewPage />);

    await userEvent.click(await screen.findByText('Hỏi A'));

    expect(screen.getByText('Ghi chú')).toBeInTheDocument();
    expect(screen.getByText('từ khoá', { selector: 'strong' })).toBeInTheDocument();
  });

  it('thẻ không có ghi chú thì không hiện khối ghi chú', async () => {
    mockApi({ 'GET /api/cards/due': dueWith(null) });
    renderWithProviders(<ReviewPage />);

    await userEvent.click(await screen.findByText('Hỏi A'));

    expect(screen.getByText('Đáp A')).toBeInTheDocument();
    expect(screen.queryByText('Ghi chú')).not.toBeInTheDocument();
  });

  it('HTML và ảnh trong ghi chú hiển thị nguyên văn, không thành phần tử', async () => {
    const note = '<img src=x onerror=alert(1)> ![meo](https://x.test/a.png)';
    mockApi({ 'GET /api/cards/due': dueWith(note) });
    const { container } = renderWithProviders(<ReviewPage />);

    await userEvent.click(await screen.findByText('Hỏi A'));

    expect(screen.getByText(note)).toBeInTheDocument();
    expect(container.querySelector('.review-card img')).toBeNull();
  });
});

describe('E7-S1-T3 — TC-059 ôn thẻ đục lỗ', () => {
  function dueCloze(back: string): Handler {
    return {
      status: 200,
      body: {
        dueCount: 1,
        dueCards: [
          {
            id: 'card-1',
            front: 'Thủ đô Pháp là [[Paris]]',
            back,
            note: null,
            dueDate: '2026-09-13T09:00:00.000Z',
          },
        ],
      },
    };
  }

  it('mặt hỏi hiện chỗ trống, mặt đáp án hiện câu đầy đủ với phần điền nổi bật', async () => {
    mockApi({ 'GET /api/cards/due': dueCloze('') });
    const { container } = renderWithProviders(<ReviewPage />);

    const blank = await screen.findByRole('img', { name: 'chỗ trống' });
    const [front, back] = container.querySelectorAll('.review-card__face');
    expect(front).toContainElement(blank);
    expect(front.textContent).not.toContain('Paris');

    await userEvent.click(blank);

    expect(back.querySelector('mark')).toHaveTextContent('Paris');
    expect(back.querySelector('.review-card__extra')).toBeNull();
  });

  it('mặt sau của thẻ đục lỗ hiện thành thông tin bổ sung dưới câu đầy đủ', async () => {
    mockApi({ 'GET /api/cards/due': dueCloze('Thủ đô từ năm 508') });
    const { container } = renderWithProviders(<ReviewPage />);

    await userEvent.click(await screen.findByRole('img', { name: 'chỗ trống' }));

    expect(container.querySelector('.review-card__extra')).toHaveTextContent('Thủ đô từ năm 508');
  });
});

describe('E8-S1-T2 — TC-063 hoàn tác lượt vừa ôn', () => {
  const RATED = { status: 200, body: { outcomeId: 'outcome-1', updatedSchedule: {} } };
  const UNDONE = { status: 200, body: { restoredSchedule: {} } };

  async function rateFirstCard() {
    await userEvent.click(await screen.findByText('Hỏi A'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));
    await screen.findByText('Hỏi B');
  }

  it('bấm Hoàn tác thì gỡ đúng outcome và thẻ cũ hiện lại ở mặt hỏi', async () => {
    const fetchMock = mockApi({
      'GET /api/cards/due': TWO_CARDS,
      'POST /api/review-outcomes': RATED,
      'DELETE /api/review-outcomes/outcome-1': UNDONE,
    });
    const { container } = renderWithProviders(<ReviewPage />);

    await rateFirstCard();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Hoàn tác lượt vừa ôn/ }));

    expect(await screen.findByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Hỏi A')).toBeInTheDocument();
    expect(container.querySelector('.review-card--flipped')).toBeNull();
    expect(screen.getByRole('button', { name: /Nhớ/ })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/review-outcomes/outcome-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('phím Z cũng hoàn tác, và chỉ được một bước', async () => {
    const fetchMock = mockApi({
      'GET /api/cards/due': TWO_CARDS,
      'POST /api/review-outcomes': RATED,
      'DELETE /api/review-outcomes/outcome-1': UNDONE,
    });
    renderWithProviders(<ReviewPage />);

    await rateFirstCard();
    await userEvent.keyboard('z');

    expect(await screen.findByText('1 / 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hoàn tác/ })).not.toBeInTheDocument();

    await userEvent.keyboard('z');
    const deletes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE');
    expect(deletes).toHaveLength(1);
  });

  it('màn hoàn thành phiên vẫn hoàn tác được thẻ cuối', async () => {
    mockApi({
      'GET /api/cards/due': {
        status: 200,
        body: { dueCount: 1, dueCards: [TWO_CARDS.body.dueCards[0]] },
      },
      'POST /api/review-outcomes': RATED,
      'DELETE /api/review-outcomes/outcome-1': UNDONE,
    });
    renderWithProviders(<ReviewPage />);

    await userEvent.click(await screen.findByText('Hỏi A'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));
    expect(await screen.findByText('Xong rồi!')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Hoàn tác lượt vừa ôn/ }));

    expect(await screen.findByText('Hỏi A')).toBeInTheDocument();
    expect(screen.queryByText('Xong rồi!')).not.toBeInTheDocument();
  });

  it('server từ chối (quá 10 phút) thì báo rõ và bỏ nút', async () => {
    mockApi({
      'GET /api/cards/due': TWO_CARDS,
      'POST /api/review-outcomes': RATED,
      'DELETE /api/review-outcomes/outcome-1': {
        status: 409,
        body: { error: { code: 'ERR_UNDO_NOT_ALLOWED', message: 'Không thể hoàn tác' } },
      },
    });
    renderWithProviders(<ReviewPage />);

    await rateFirstCard();
    await userEvent.click(screen.getByRole('button', { name: /Hoàn tác lượt vừa ôn/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('không còn hoàn tác được');
    expect(screen.queryByRole('button', { name: /Hoàn tác/ })).not.toBeInTheDocument();
    expect(screen.getByText('Hỏi B')).toBeInTheDocument();
  });

  it('lỗi mạng khi hoàn tác thì giữ nút để bấm lại', async () => {
    mockApi({
      'GET /api/cards/due': TWO_CARDS,
      'POST /api/review-outcomes': RATED,
      'DELETE /api/review-outcomes/outcome-1': { status: 503, body: null },
    });
    renderWithProviders(<ReviewPage />);

    await rateFirstCard();
    await userEvent.click(screen.getByRole('button', { name: /Hoàn tác lượt vừa ôn/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('có thể do mạng');
    expect(screen.getByRole('button', { name: /Hoàn tác lượt vừa ôn/ })).toBeEnabled();
  });

  it('chưa chấm thẻ nào thì không có nút và phím Z không gọi gì', async () => {
    const fetchMock = mockApi({ 'GET /api/cards/due': TWO_CARDS });
    renderWithProviders(<ReviewPage />);

    await screen.findByText('Hỏi A');
    await userEvent.keyboard('z');

    expect(screen.queryByRole('button', { name: /Hoàn tác/ })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });
});

describe('E8-S1-T4 — TC-065 ôn thêm thẻ sắp quên', () => {
  const RATED = { status: 200, body: { outcomeId: 'outcome-1', updatedSchedule: {} } };

  function extraCard(id: string, front: string) {
    return { id, front, back: `Đáp ${front}`, note: null, dueDate: '2026-09-30T09:00:00.000Z' };
  }

  /** Hai route thật để kiểm việc chuyển phiên đến hạn → Ôn thêm → Ôn thêm lần nữa. */
  function renderReviewRoutes(route: string) {
    return renderWithProviders(
      <Routes>
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/review/extra" element={<ReviewPage source="extra" />} />
      </Routes>,
      { route },
    );
  }

  it('hết thẻ đến hạn thì mời ôn thêm, bấm vào là phiên mới lấy thẻ từ /api/cards/extra', async () => {
    const fetchMock = mockApi({
      'GET /api/cards/due': { status: 200, body: { dueCount: 0, dueCards: [] } },
      'GET /api/cards/extra': {
        status: 200,
        body: { extraCards: [extraCard('card-x', 'Hỏi X'), extraCard('card-y', 'Hỏi Y')] },
      },
      'POST /api/review-outcomes': RATED,
    });
    renderReviewRoutes('/review');

    await screen.findByText('Xong rồi!');
    expect(screen.getByText('Thẻ đến hạn hôm nay')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ôn thêm 5 thẻ sắp quên' }));

    expect(await screen.findByText('Hỏi X')).toBeInTheDocument();
    expect(screen.getByText('Ôn thêm · thẻ sắp quên')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Chấm như lượt thường: cùng endpoint nên được tính vào Streak (BR-001)
    await userEvent.click(screen.getByText('Hỏi X'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));
    await screen.findByText('Hỏi Y');

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({
      cardId: 'card-x',
      outcome: 'remembered',
    });
  });

  it('xong lượt ôn thêm thì mời 5 thẻ nữa, lượt sau nạp lại danh sách mới từ đầu', async () => {
    const batches = [[extraCard('card-x', 'Hỏi X')], [extraCard('card-z', 'Hỏi Z')]];
    const fetchMock = mockApi({
      'GET /api/cards/extra': () => ({ status: 200, body: { extraCards: batches.shift() ?? [] } }),
      'POST /api/review-outcomes': RATED,
    });
    renderReviewRoutes('/review/extra');

    await userEvent.click(await screen.findByText('Hỏi X'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));

    expect(await screen.findByText('Xong lượt ôn thêm!')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ôn thêm 5 thẻ nữa' }));

    // Phiên mới: về thẻ đầu tiên của danh sách mới, không kế thừa vị trí cũ
    expect(await screen.findByText('Hỏi Z')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    const extraRequests = fetchMock.mock.calls.filter(([url]) => url === '/api/cards/extra');
    expect(extraRequests).toHaveLength(2);
  });

  it('không có thẻ nào để ôn thêm thì giải thích và không mời bấm lại', async () => {
    mockApi({ 'GET /api/cards/extra': { status: 200, body: { extraCards: [] } } });
    renderReviewRoutes('/review/extra');

    expect(await screen.findByText('Chưa có thẻ nào để ôn thêm')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ôn thêm/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Về trang chủ' })).toBeInTheDocument();
  });
});
