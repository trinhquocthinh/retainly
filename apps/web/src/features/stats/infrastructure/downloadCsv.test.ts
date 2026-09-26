import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadCsv } from './downloadCsv';

const { createObjectURL, revokeObjectURL } = URL;

afterEach(() => {
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('E10-S1-T5 — tải tệp CSV', () => {
  it('tải tệp đúng tên, có BOM UTF-8 rồi trả lại URL tạm', async () => {
    vi.useFakeTimers();
    // jsdom không có hai hàm này nên gán trực tiếp thay vì spyOn.
    const created: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob);
      return 'blob:report';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadCsv('bao-cao.csv', 'Chỉ số,Giá trị\r\n');

    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('bao-cao.csv');
    expect(link.href).toBe('blob:report');
    expect(created[0]?.type).toBe('text/csv;charset=utf-8');
    // `text()` bỏ BOM khi giải mã nên đọc byte thô.
    const bytes = new Uint8Array(await created[0]!.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });
});
