import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { lazyPage } from './lazyPage';

function Greeting({ name }: { name: string }) {
  return <p>Xin chào {name}</p>;
}

function renderPage(Page: ReturnType<typeof lazyPage<{ name: string }>>) {
  return render(
    <Suspense fallback={<p>Đang tải…</p>}>
      <Page name="Thịnh" />
    </Suspense>,
  );
}

describe('lazyPage', () => {
  it('chưa nạp sẵn thì treo như lazy() rồi mới hiện màn', async () => {
    const Page = lazyPage(() => Promise.resolve(Greeting));

    renderPage(Page);

    expect(screen.getByText('Đang tải…')).toBeInTheDocument();
    expect(await screen.findByText('Xin chào Thịnh')).toBeInTheDocument();
  });

  it('đã nạp sẵn thì render thẳng, không qua fallback', async () => {
    const Page = lazyPage(() => Promise.resolve(Greeting));
    await Page.preload();

    renderPage(Page);

    expect(screen.queryByText('Đang tải…')).not.toBeInTheDocument();
    expect(screen.getByText('Xin chào Thịnh')).toBeInTheDocument();
  });

  it('nạp sẵn hỏng thì lúc render tải lại', async () => {
    let attempts = 0;
    const Page = lazyPage(() =>
      ++attempts === 1 ? Promise.reject(new Error('mất mạng')) : Promise.resolve(Greeting),
    );
    await expect(Page.preload()).rejects.toThrow('mất mạng');

    renderPage(Page);

    expect(await screen.findByText('Xin chào Thịnh')).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
