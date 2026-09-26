import { screen, waitFor, within } from '@testing-library/react';
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
    const luu = screen.getByRole('button', { name: 'Lưu và tạo tiếp' });
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

    expect(screen.getByRole('button', { name: 'Lưu và tạo tiếp' })).toBeDisabled();
  });

  it('gửi đúng nội dung tới POST /api/cards', async () => {
    const fetchGia = mockFetch(201, { id: 'card-1' });
    renderPage();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }));

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
    await userEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }));

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
    await userEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không lưu được thẻ, kiểm tra mạng rồi thử lại',
    );
  });

  it('lưu xong thì xoá trắng hai ô và hiện xác nhận', async () => {
    mockFetch(201, { id: 'card-1' });
    renderPage();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu thẻ');
    expect(screen.getByLabelText('Mặt hỏi')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Lưu và tạo tiếp' })).toBeDisabled();
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

    await userEvent.selectOptions(screen.getByLabelText('Chủ đề'), topicId);
    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Hỏi');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Đáp');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }));

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
    await userEvent.click(screen.getByRole('button', { name: /Thêm mẹo ghi nhớ/ }));
    await userEvent.type(screen.getByLabelText(/Ghi chú/), 'Nhớ tháp **Eiffel**');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }));

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

describe('E7-S1-T3 — TC-057 tạo thẻ đục lỗ', () => {
  it('mặt hỏi có đoạn đục lỗ thì lưu được khi để trống mặt trả lời', async () => {
    const fetchGia = mockFetch(201, { id: 'card-1' });
    renderPage();
    const luu = screen.getByRole('button', { name: 'Lưu và tạo tiếp' });

    await userEvent.click(screen.getByLabelText('Mặt hỏi'));
    await userEvent.paste('Thủ đô Pháp là [[ ]]');
    expect(luu).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('Mặt hỏi'));
    await userEvent.paste('Thủ đô Pháp là [[Paris]]');
    expect(luu).toBeEnabled();

    await userEvent.click(luu);

    await waitFor(() => {
      expect(fetchGia.mock.calls.some(([url]) => url === '/api/cards')).toBe(true);
    });
    const [, option] = fetchGia.mock.calls.find(([url]) => url === '/api/cards') ?? [];
    expect(JSON.parse(String(option?.body))).toEqual({
      front: 'Thủ đô Pháp là [[Paris]]',
      back: '',
    });
  });
});

describe('E7-S1-T4 — form soạn thẻ theo design 0.1.2', () => {
  it('nút B bọc đoạn đang chọn ở mặt hỏi thành chữ đậm', async () => {
    mockFetch(201, { id: 'card-1' });
    renderPage();
    const matHoi = screen.getByLabelText<HTMLTextAreaElement>('Mặt hỏi');

    await userEvent.type(matHoi, 'Thủ đô Pháp là Paris');
    matHoi.setSelectionRange(15, 20);
    const toolbar = screen.getByRole('toolbar', { name: 'Định dạng mặt hỏi' });
    await userEvent.click(within(toolbar).getByRole('button', { name: 'In đậm' }));

    expect(matHoi).toHaveValue('Thủ đô Pháp là **Paris**');
    expect(matHoi.value.slice(matHoi.selectionStart, matHoi.selectionEnd)).toBe('Paris');
  });

  it('nút Cloze chỉ có ở mặt hỏi; đục lỗ xong thì mặt trả lời thành tuỳ chọn', async () => {
    mockFetch(201, { id: 'card-1' });
    renderPage();

    expect(
      within(screen.getByRole('toolbar', { name: 'Định dạng mặt trả lời' })).queryByRole('button', {
        name: /Tạo chỗ trống/,
      }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Mặt hỏi'));
    await userEvent.paste('Thủ đô Pháp là ');
    await userEvent.click(screen.getByRole('button', { name: /Tạo chỗ trống/ }));

    expect(screen.getByLabelText('Mặt hỏi')).toHaveValue('Thủ đô Pháp là [[đáp án]]');
    expect(screen.getByLabelText('Mặt trả lời — tuỳ chọn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu và tạo tiếp' })).toBeEnabled();
  });

  it('bộ đếm ký tự theo sát nội dung và trần của từng ô', async () => {
    renderPage();

    expect(screen.getAllByText('0/2000')).toHaveLength(2);
    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');

    expect(screen.getByText('12/2000')).toBeInTheDocument();
    expect(screen.getByText('0/1000')).toBeInTheDocument();
  });

  it('ô Ghi chú thu gọn mặc định, bấm mới mở ra', async () => {
    renderPage();
    const toggle = screen.getByRole('button', { name: /Thêm mẹo ghi nhớ/ });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText(/Ghi chú/)).not.toBeVisible();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText(/Ghi chú/)).toBeVisible();
  });

  it('xem trước thẻ: trống thì nhắc gõ, có cloze thì hiện chỗ trống và lật được', async () => {
    renderPage();

    expect(screen.getByText(/Nhập mặt hỏi để xem thẻ/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lật thẻ' })).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Mặt hỏi'));
    await userEvent.paste('Thủ đô Pháp là [[Paris]]');

    expect(screen.getByRole('img', { name: 'chỗ trống' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lật thẻ' }));
    // Tên nút lấy từ nội dung mặt đang hiện; jsdom không chèn khoảng trắng giữa các span.
    expect(
      screen.getByRole('button', { name: /^Đáp án\s*Thủ đô Pháp là Paris/ }),
    ).toBeInTheDocument();
  });

  it('Làm mới xoá bản nháp sau khi người dùng xác nhận', async () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    renderPage();
    const lamMoi = screen.getByRole('button', { name: 'Làm mới' });

    expect(lamMoi).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.click(lamMoi);

    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Mặt hỏi')).toHaveValue('');
    expect(lamMoi).toBeDisabled();
  });
});
