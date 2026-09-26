import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { CreateCardPage } from './CreateCardPage';

const ARTICLE = {
  sourceId: '00000000-0000-0000-0000-0000000000b1',
  title: 'Spaced repetition hoạt động thế nào',
  cleanText: '## Đường cong quên\n\nTrí nhớ suy giảm theo đường cong quên của Ebbinghaus.',
};

type FakeResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type FakeFetch = (url: string, option?: RequestInit) => Promise<FakeResponse>;

/** Giả lập máy chủ theo từng endpoint: một lần chạy đụng cả /sources lẫn /cards. */
function mockApi(routes: Record<string, { status: number; body: unknown }>) {
  // Khai kiểu qua generic chứ không qua tham số: thân hàm không cần `option`,
  // nhưng `mock.calls` thì cần biết lời gọi có kèm option — chỗ chứa body.
  const fetchMock = vi.fn<FakeFetch>(async (url) => {
    if (url === '/api/topics') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ topics: [] }),
      };
    }

    const route = routes[url];
    if (!route) throw new TypeError(`Không có route giả cho ${url}`);
    return { ok: route.status < 400, status: route.status, json: async () => route.body };
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function moTabUrl() {
  await userEvent.click(screen.getByRole('tab', { name: 'Từ bài viết' }));
}

async function napUrl(url = 'https://example.com/bai-viet') {
  await userEvent.type(screen.getByLabelText('Liên kết bài viết'), url);
  await userEvent.click(screen.getByRole('button', { name: 'Mở bài viết' }));
}

/** Bôi đen trọn một phần tử rồi thả chuột, đúng như thao tác thật. */
function boiDen(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  fireEvent.mouseUp(element);
}

afterEach(() => vi.unstubAllGlobals());

describe('E2-S2-T5 — tạo thẻ từ URL', () => {
  it('tab Từ URL mở ra ô nhập đường dẫn', async () => {
    renderWithProviders(<CreateCardPage />);
    expect(screen.queryByLabelText('Liên kết bài viết')).not.toBeInTheDocument();

    await moTabUrl();

    expect(screen.getByLabelText('Liên kết bài viết')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Từ bài viết' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('nạp thành công thì hiện tiêu đề và nội dung đã bóc tách', async () => {
    mockApi({ '/api/sources': { status: 201, body: ARTICLE } });
    renderWithProviders(<CreateCardPage />);

    await moTabUrl();
    await napUrl();

    expect(await screen.findByText(ARTICLE.title)).toBeInTheDocument();
    expect(screen.getByText('Đường cong quên')).toBeInTheDocument();
    expect(
      screen.getByText('Trí nhớ suy giảm theo đường cong quên của Ebbinghaus.'),
    ).toBeInTheDocument();
  });

  it('nguồn hỏng hiện lỗi ngay dưới ô URL, không mở panel', async () => {
    mockApi({
      '/api/sources': {
        status: 502,
        body: { error: { code: 'ERR_FETCH_FAILED', message: 'loi may chu' } },
      },
    });
    renderWithProviders(<CreateCardPage />);

    await moTabUrl();
    await napUrl();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Chưa đọc được nội dung từ liên kết này',
    );
    expect(screen.queryByText('Nội dung bài viết')).not.toBeInTheDocument();
  });

  it('lưu thẻ ở tab Từ URL thì gửi kèm sourceId', async () => {
    const fetchGia = mockApi({
      '/api/sources': { status: 201, body: ARTICLE },
      '/api/cards': { status: 201, body: { id: 'card-1' } },
    });
    renderWithProviders(<CreateCardPage />);

    await moTabUrl();
    await napUrl();
    await screen.findByText(ARTICLE.title);

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Đường cong quên do ai mô tả?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Hermann Ebbinghaus');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }));

    await waitFor(() => {
      expect(fetchGia.mock.calls.some(([url]) => url === '/api/cards')).toBe(true);
    });

    const cardCall = fetchGia.mock.calls.find(([url]) => url === '/api/cards');
    const [, option] = cardCall ?? [];

    expect(JSON.parse(String(option?.body))).toEqual({
      front: 'Đường cong quên do ai mô tả?',
      back: 'Hermann Ebbinghaus',
      sourceId: ARTICLE.sourceId,
    });
  });

  it('lưu xong thì giữ nguồn lại, chỉ xoá hai mặt thẻ', async () => {
    mockApi({
      '/api/sources': { status: 201, body: ARTICLE },
      '/api/cards': { status: 201, body: { id: 'card-1' } },
    });
    renderWithProviders(<CreateCardPage />);

    await moTabUrl();
    await napUrl();
    await screen.findByText(ARTICLE.title);

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Hỏi');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Đáp');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Đã lưu thẻ. Bạn có thể chọn thêm ý từ bài viết này.',
    );
    expect(screen.getByText(ARTICLE.title)).toBeInTheDocument();
    expect(screen.getByLabelText('Mặt hỏi')).toHaveValue('');
    expect(screen.getByLabelText('Mặt trả lời')).toHaveValue('');
  });

  it('bôi đen một đoạn thì điền vào mặt trả lời đang rỗng', async () => {
    mockApi({ '/api/sources': { status: 201, body: ARTICLE } });
    renderWithProviders(<CreateCardPage />);

    await moTabUrl();
    await napUrl();

    boiDen(await screen.findByText('Trí nhớ suy giảm theo đường cong quên của Ebbinghaus.'));

    await waitFor(() =>
      expect(screen.getByLabelText('Mặt trả lời')).toHaveValue(
        'Trí nhớ suy giảm theo đường cong quên của Ebbinghaus.',
      ),
    );
  });

  it('không đè lên mặt trả lời người dùng đã gõ', async () => {
    mockApi({ '/api/sources': { status: 201, body: ARTICLE } });
    renderWithProviders(<CreateCardPage />);

    await moTabUrl();
    await napUrl();
    await screen.findByText(ARTICLE.title);

    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Câu trả lời của tôi');
    boiDen(screen.getByText('Trí nhớ suy giảm theo đường cong quên của Ebbinghaus.'));

    expect(screen.getByLabelText('Mặt trả lời')).toHaveValue('Câu trả lời của tôi');
  });
});
