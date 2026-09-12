import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { App } from './App';

function renderTai(duongDan: string) {
  render(
    <MemoryRouter initialEntries={[duongDan]}>
      <App />
    </MemoryRouter>,
  );
}

describe('E0-S2-T4 — khung định tuyến', () => {
  it.each([
    ['/', 'Trang chủ'],
    ['/review', 'Ôn tập'],
    ['/cards', 'Thư viện thẻ'],
    ['/cards/new', 'Thẻ mới'],
    ['/login', 'Đăng nhập'],
  ])('route %s render màn hình "%s"', (duongDan, tieuDe) => {
    renderTai(duongDan);
    expect(screen.getByRole('heading', { name: tieuDe })).toBeTruthy();
  });

  it('đường dẫn lạ rơi vào màn hình không tìm thấy', () => {
    renderTai('/duong-dan-khong-ton-tai');
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeTruthy();
  });
});
