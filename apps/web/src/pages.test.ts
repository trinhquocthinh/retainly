import { afterEach, describe, expect, it, vi } from 'vitest';

import * as pages from './pages';

const PAGES = [
  'LoginPage',
  'ReviewPage',
  'HomePage',
  'CardLibraryPage',
  'CreateCardPage',
  'StatsPage',
  'AccountPage',
] as const;

function spyAllPreloads() {
  return Object.fromEntries(
    PAGES.map((name) => [name, vi.spyOn(pages[name], 'preload').mockResolvedValue(() => null)]),
  ) as Record<(typeof PAGES)[number], ReturnType<typeof vi.fn>>;
}

function preloaded(spies: ReturnType<typeof spyAllPreloads>) {
  return PAGES.filter((name) => spies[name].mock.calls.length > 0);
}

describe('preloadPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['/login', 'LoginPage'],
    ['/', 'HomePage'],
    ['/review', 'ReviewPage'],
    ['/review/extra', 'ReviewPage'],
    ['/review/topic/abc', 'ReviewPage'],
    ['/cards', 'CardLibraryPage'],
    ['/cards/new', 'CreateCardPage'],
    ['/stats', 'StatsPage'],
    ['/account', 'AccountPage'],
  ])('%s nạp sẵn đúng một màn %s', (pathname, page) => {
    const spies = spyAllPreloads();

    void pages.preloadPage(pathname);

    expect(preloaded(spies)).toEqual([page]);
  });

  it('đường dẫn không có màn thì không nạp gì', () => {
    const spies = spyAllPreloads();

    void pages.preloadPage('/khong-co');

    expect(preloaded(spies)).toEqual([]);
  });

  it('nạp hỏng thì nuốt lỗi để lazy() tự tải lại khi render', async () => {
    const preload = vi.spyOn(pages.StatsPage, 'preload').mockRejectedValue(new Error('mất mạng'));

    await expect(pages.preloadPage('/stats')).resolves.toBeUndefined();
    expect(preload).toHaveBeenCalledOnce();
  });
});
