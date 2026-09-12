import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateCardPage } from './CreateCardPage';

function renderPage() {
  render(
    <MemoryRouter>
      <CreateCardPage />
    </MemoryRouter>,
  );
}

function mockFetch(status: number, body: unknown) {
  const fetchGia = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchGia);
  return fetchGia;
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

    await waitFor(() => expect(fetchGia).toHaveBeenCalledTimes(1));
    const [duongDan, tuyChon] = fetchGia.mock.calls[0];
    expect(duongDan).toBe('/api/cards');
    expect(JSON.parse(tuyChon.body)).toEqual({ front: 'Thủ đô Pháp?', back: 'Paris' });
  });

  it('lỗi ERR_EMPTY_BACK hiện ngay dưới ô Mặt trả lời', async () => {
    mockFetch(400, {
      error: { code: 'ERR_EMPTY_BACK', message: 'Mặt trả lời của thẻ không được để trống' },
    });
    renderPage();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }));

    const loi = await screen.findByRole('alert');
    expect(loi.textContent).toBe('Mặt trả lời của thẻ không được để trống');
    expect(screen.getByLabelText('Mặt trả lời')).toHaveAttribute('aria-invalid', 'true');
  });

  it('lỗi mạng hiện banner chung, không gán vào ô nào', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderPage();

    await userEvent.type(screen.getByLabelText('Mặt hỏi'), 'Thủ đô Pháp?');
    await userEvent.type(screen.getByLabelText('Mặt trả lời'), 'Paris');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Không lưu được thẻ, thử lại sau');
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
});
