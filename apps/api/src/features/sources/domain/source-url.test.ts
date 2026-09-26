import { describe, expect, it } from 'vitest';

import { AppError } from '../../../shared/errors';
import { parseSourceUrl } from './source-url';

const expectInvalid = (raw: string): void => {
  expect(() => parseSourceUrl(raw)).toThrow(new AppError('ERR_INVALID_URL'));
};

describe('parseSourceUrl', () => {
  it('chấp nhận URL http/https công khai và cắt khoảng trắng thừa', () => {
    expect(parseSourceUrl('  https://example.com/bai-viet  ').toString()).toBe(
      'https://example.com/bai-viet',
    );
  });

  // TC-003: sai cú pháp phải chặn trước khi gọi network
  it.each(['', 'khong-phai-url', 'example.com/bai-viet', 'https://'])(
    'từ chối URL sai cú pháp: %s',
    expectInvalid,
  );

  it.each(['ftp://example.com/a', 'file:///etc/passwd', 'javascript:alert(1)'])(
    'từ chối scheme ngoài http/https: %s',
    expectInvalid,
  );

  it('từ chối URL nhúng credential', () => {
    expectInvalid('https://user:pass@example.com/a');
  });

  it.each(['http://example.com:8080/a', 'http://example.com:22/a', 'http://example.com:6379/a'])(
    'từ chối cổng ngoài 80/443: %s',
    expectInvalid,
  );

  it('vẫn cho phép cổng chuẩn ghi tường minh', () => {
    expect(() => parseSourceUrl('https://example.com:443/a')).not.toThrow();
  });

  it.each(['http://localhost/a', 'http://nas.local/a', 'http://db.internal/a'])(
    'từ chối hostname nội bộ: %s',
    expectInvalid,
  );

  // DoD E2-S1-T2: chặn dải IP private ngay ở tầng domain khi URL là IP literal
  it.each([
    'http://127.0.0.1/a',
    'http://10.0.0.5/a',
    'http://172.16.0.1/a',
    'http://192.168.1.10/a',
    'http://169.254.169.254/latest/meta-data',
    'http://100.64.0.1/a',
    'http://0.0.0.0/a',
    'http://2130706433/a',
    'http://[::1]/a',
    'http://[fd00::1]/a',
    'http://[::ffff:192.168.1.1]/a',
  ])('từ chối IP nội bộ: %s', expectInvalid);

  it.each(['http://8.8.8.8/a', 'https://[2606:4700:4700::1111]/a'])(
    'vẫn cho phép IP công khai: %s',
    (raw) => {
      expect(() => parseSourceUrl(raw)).not.toThrow();
    },
  );
});
