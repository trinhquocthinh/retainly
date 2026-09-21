import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { CardLibraryPage } from './CardLibraryPage';

const CARD = {
  id: '00000000-0000-4000-8000-000000000001',
  sourceId: null,
  front: 'FSRS dùng để làm gì?',
  back: 'Lập lịch ôn tập theo trí nhớ.',
  createdAt: '2026-09-16T00:00:00.000Z',
};

function response(status: number, body: unknown) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

function libraryPayload(items = [CARD]) {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: items.length === 0 ? 0 : 1,
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('E3-S1-T3 — Thư viện thẻ', () => {
  it('hiển thị danh sách thật và tổng số thẻ từ API', async () => {
    const fetchMock = vi.fn().mockImplementation(() => response(200, libraryPayload()));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    expect(await screen.findByText('FSRS dùng để làm gì?')).toBeVisible();
    expect(screen.getByText('Lập lịch ôn tập theo trí nhớ.')).toBeVisible();
    expect(screen.getByText('1 thẻ')).toBeVisible();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/cards?page=1&pageSize=20');
  });

  it('sửa hai mặt thẻ, giữ dialog mở trong lúc lỗi và đóng sau khi lưu thành công', async () => {
    let card = { ...CARD };
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        card = { ...card, ...(JSON.parse(String(options.body)) as object) };
        return response(200, card);
      }
      return response(200, libraryPayload([card]));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    await userEvent.click(await screen.findByRole('button', { name: /Sửa thẻ/ }));

    const front = screen.getByLabelText('Mặt hỏi');
    await userEvent.clear(front);
    await userEvent.type(front, 'FSRS lập lịch dựa trên điều gì?');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu thay đổi của thẻ');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('FSRS lập lịch dựa trên điều gì?')).toBeVisible();

    const patchCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(patchCall?.[0]).toBe(`/api/cards/${CARD.id}`);
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
      front: 'FSRS lập lịch dựa trên điều gì?',
      back: CARD.back,
    });
  });

  it('chỉ xoá sau bước xác nhận và chuyển sang empty state', async () => {
    let cards = [CARD];
    const fetchMock = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      if (options?.method === 'DELETE') {
        cards = [];
        return response(200, { deleted: true });
      }
      return response(200, libraryPayload(cards));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });
    const deleteButton = await screen.findByRole('button', { name: /Xoá thẻ/ });

    await userEvent.click(deleteButton);
    expect(screen.getByRole('alertdialog')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Giữ lại thẻ' }));
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false);

    await userEvent.click(deleteButton);
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xoá' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Đã xoá thẻ khỏi thư viện');
    expect(await screen.findByRole('heading', { name: 'Thư viện chưa có thẻ nào' })).toBeVisible();
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(true),
    );
  });
});

describe('E7-S1-T1 — định dạng trong thư viện thẻ', () => {
  it('hiển thị đậm/code ở danh sách, còn nhãn nút và hộp xác nhận xoá dùng chữ đã gỡ dấu', async () => {
    const card = {
      ...CARD,
      front: '**FSRS** dùng `R` để làm gì?',
      back: 'Lập lịch *theo* trí nhớ.',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => response(200, libraryPayload([card]))),
    );

    renderWithProviders(<CardLibraryPage />, { route: '/cards' });

    expect(await screen.findByText('FSRS', { selector: 'strong' })).toBeVisible();
    expect(screen.getByText('R', { selector: 'code' })).toBeVisible();
    expect(screen.getByText('theo', { selector: 'em' })).toBeVisible();

    const deleteButton = screen.getByRole('button', { name: 'Xoá thẻ “FSRS dùng R để làm gì?”' });
    expect(screen.getByRole('button', { name: 'Sửa thẻ “FSRS dùng R để làm gì?”' })).toBeVisible();

    await userEvent.click(deleteButton);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('“FSRS dùng R để làm gì?”');
  });
});
