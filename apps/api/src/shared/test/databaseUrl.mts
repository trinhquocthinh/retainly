export const TEST_DATABASE_NAME = 'retainly_test';

/**
 * URL của DB test, suy ra từ DATABASE_URL hiện có bằng cách đổi tên database.
 * Cố ý không dùng file .env riêng: một nguồn thông tin đăng nhập, và tham số
 * `options=-c timezone=UTC` tự động đi theo — thiếu nó thì test sẽ chạy trên
 * một cấu hình khác production và không phát hiện được lỗi múi giờ.
 */
export function testDatabaseUrl(): string {
  const base = process.env['DATABASE_URL'];
  if (base === undefined) throw new Error('Thiếu DATABASE_URL — chạy yarn db:up trước');

  const url = new URL(base);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
}
