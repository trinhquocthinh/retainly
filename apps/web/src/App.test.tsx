import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@src/test-utils';

import { App } from './App';

function renderAt(path: string) {
  renderWithProviders(<App />, { route: path });
}

describe('E0-S2-T4 — khung định tuyến', () => {
  it.each([
    ['/', 'Trang chủ'],
    ['/review', 'Ôn tập'],
    ['/cards', 'Thư viện thẻ'],
    ['/cards/new', 'Thẻ mới'],
    ['/login', 'Đăng nhập'],
  ])('route %s render màn hình "%s"', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', { name: title })).toBeTruthy();
  });

  it('đường dẫn lạ rơi vào màn hình không tìm thấy', () => {
    renderAt('/duong-dan-khong-ton-tai');
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeTruthy();
  });
});
