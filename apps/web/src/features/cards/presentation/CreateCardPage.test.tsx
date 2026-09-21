import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { CreateCardPage } from './CreateCardPage';

type FakeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type FakeFetch = (url: string, option?: RequestInit) => Promise<FakeResponse>;

function renderPage() {
  renderWithProviders(<CreateCardPage />);
}

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn<FakeFetch>(async (url) => {
    if (url === '/api/topics') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ topics: [] }),
      };
    }

    return {
      ok: status < 400,
      status,
      json: async () => body,
    };
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('E1-S3-T6 — màn tạo thẻ', () => {
  it('nút Lưu bị vô hiệu khi chưa nhập đủ hai mặt', async () => {
    renderPage();
    const luu = screen.getByRole('button', { name: 'Lưu thẻ' });
    expect(luu).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    expect(luu).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    expect(luu).toBeEnabled();
  });

  it('khoảng trắng thuần không tính là đã nhập', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Mặt hỏi'), '   ');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), '   ');

    expect(screen.getByRole('button', { name: 'Lưu thẻ' })).toBeDisabled();
  });

  it('gửi đúng nội dung tới POST /api/cards', async () => {
    const fetchGia = mockFetch(201, { id: 'card-1' });
    renderPage();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }));

    await waitFor(() => {
      expect(fetchGia.mock.calls.some(([url]) => url === '/api/cards')).toBe(true);
    });

    const cardCall = fetchGia.mock.calls.find(([url]) => url === '/api/cards');
    const [, option] = cardCall ?? [];

    expect(JSON.parse(String(option?.body))).toEqual({
      front: 'Thủ đô Pháp?',
      back: 'Paris',
    });
  });

  it('lỗi ERR_EMPTY_BACK hiện ngay dưới ô Mặt trả lời', async () => {
    mockFetch(400, {
      error: { code: 'ERR_EMPTY_BACK', message: 'Mặt trả lời của thẻ không được để trống' },
    });
    renderPage();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }));

    const error = await screen.findByRole('alert');
    expect(error.textContent).toBe('Mặt trả lời của thẻ không được để trống');
    expect(screen.getByLabelText('Mặt trả lời')).toHaveAttribute('aria-invalid', 'true');
  });

  it('lỗi mạng hiện banner chung, không gán vào ô nào', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/topics') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ topics: [] }),
          };
        }

        throw new TypeError('Failed to fetch');
      }),
    );
    renderPage();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không lưu được thẻ, kiểm tra mạng rồi thử lại',
    );
  });

  it('lưu xong thì xoá trắng hai ô và hiện xác nhận', async () => {
    mockFetch(201, { id: 'card-1' });
    renderPage();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu thẻ');
    expect(screen.getByLabelText('Mặt hỏi')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Lưu thẻ' })).toBeDisabled();
  });

  it('gửi topicId đã chọn trong cùng request tạo thẻ', async () => {
    const topicId = '00000000-0000-0000-0000-0000000000a1';

    const fetchMock = vi.fn<FakeFetch>(async (url) => {
      if (url === '/api/topics') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            topics: [
              {
                id: topicId,
                name: 'Khoa học',
                createdAt: '2026-09-20T00:00:00.000Z',
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'card-1',
          topicId,
        }),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await screen.findByRole('option', { name: 'Khoa học' });

    await userEvent.selectOptions(screen.getByLabelText('Nhánh kiến thức'), topicId);
    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Hỏi');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Đáp');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/cards')).toBe(true);
    });

    const cardCall = fetchMock.mock.calls.find(([url]) => url === '/api/cards');
    const [, option] = cardCall ?? [];

    expect(JSON.parse(String(option?.body))).toEqual({
      front: 'Hỏi',
      back: 'Đáp',
      topicId,
    });
  });
});

describe('E7-S1-T2 — TC-055 ghi chú khi tạo thẻ', () => {
  it('có nhập ghi chú thì gửi kèm note', async () => {
    const fetchMock = mockFetch(201, { id: 'card-1' });
    renderPage();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    await userEvent.type(screen.getByLabelText(/Ghi chú/), 'Nhớ tháp **Eiffel**');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/cards')).toBe(true);
    });
    const [, option] = fetchMock.mock.calls.find(([url]) => url === '/api/cards') ?? [];

    expect(JSON.parse(String(option?.body))).toEqual({
      front: 'Thủ đô Pháp?',
      back: 'Paris',
      note: 'Nhớ tháp **Eiffel**',
    });
    await waitFor(() => expect(screen.getByLabelText(/Ghi chú/)).toHaveValue(''));
  });
});
