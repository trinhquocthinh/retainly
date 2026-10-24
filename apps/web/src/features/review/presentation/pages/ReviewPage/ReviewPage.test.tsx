import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@src/shared/test/renderWithProviders';
import type { PracticeSession } from '../../../domain/practice';
import { ReviewPage } from './ReviewPage';

const NOW = '2026-10-24T03:00:00.000Z';
function session(): PracticeSession {
  return {
    id: 'lesson-1',
    size: 15,
    canUndo: false,
    topicId: null,
    status: 'active',
    createdAt: NOW,
    closedAt: null,
    items: ['A', 'B'].map((letter, i) => ({
      id: `item-${i}`,
      answer: null,
      card: {
        id: `card-${i}`,
        front: `Hỏi ${letter}`,
        back: `Đáp ${letter}`,
        note: null,
        dueDate: NOW,
        memory: {
          stability: 0,
          difficulty: 0,
          retrievability: 0,
          lastReviewedAt: null,
          forecastDays: { remembered: 3, forgotten: 1 },
        },
      },
    })),
  };
}

function server(initial: PracticeSession | null = session(), failSave = false) {
  const current = structuredClone(initial);
  if (current) current.canUndo = current.items.some((i) => i.answer !== null);
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const reply = (body: unknown, status = 200) => ({
      ok: status < 400,
      status,
      json: async () => structuredClone(body),
    });
    const method = init?.method ?? 'GET';
    if (url === '/api/practice-sessions' && method === 'POST') return reply({ session: current });
    if (url === '/api/practice-sessions/lesson-1' && method === 'GET')
      return reply({ session: current });
    if (url === '/api/practice-sessions/lesson-1/outcomes') {
      if (failSave) return reply(null, 503);
      const body = JSON.parse(String(init?.body));
      const item = current!.items.find((i) => i.id === body.itemId)!;
      current!.canUndo = true;
      item.answer = { id: `outcome-${item.id}`, outcome: body.outcome, reviewedAt: NOW };
      if (current!.items.every((i) => i.answer !== null)) {
        current!.status = 'completed';
        current!.closedAt = NOW;
      }
      return reply({ session: current });
    }
    if (url === '/api/practice-sessions/lesson-1/undo') {
      [...current!.items].reverse().find((i) => i.answer !== null)!.answer = null;
      current!.status = 'active';
      current!.closedAt = null;
      current!.canUndo = false;
      return reply({ session: current });
    }
    return reply(null, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('bài học nhỏ trên giao diện', () => {
  it('chỉ gửi kết quả sau khi lật thẻ, sau đó chuyển sang câu kế tiếp', async () => {
    const calls = server();
    renderWithProviders(<ReviewPage />);
    await screen.findByText('Hỏi A');
    expect(screen.getByRole('button', { name: /Nhớ/ })).toBeDisabled();
    await userEvent.click(screen.getByText('Hỏi A'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));
    expect(await screen.findByText('Hỏi B')).toBeVisible();
    const save = calls.mock.calls.find(([url]) => url.endsWith('/outcomes'));
    expect(JSON.parse(String(save?.[1]?.body))).toEqual({
      itemId: 'item-0',
      outcome: 'remembered',
    });
    expect(screen.getByText('2 / 2')).toBeVisible();
  });

  it('tải lại bài theo URL tiếp tục từ thẻ chưa trả lời', async () => {
    const current = session();
    current.items[0].answer = { id: 'outcome', outcome: 'remembered', reviewedAt: NOW };
    server(current);
    renderWithProviders(<ReviewPage />, { route: '/review?session=lesson-1' });
    expect(await screen.findByText('Hỏi B')).toBeVisible();
    expect(screen.getByText('2 / 2')).toBeVisible();
  });

  it('hoàn thành có tổng kết và chờ user chọn bài tiếp theo', async () => {
    const calls = server();
    renderWithProviders(<ReviewPage />);
    for (const letter of ['A', 'B']) {
      await userEvent.click(await screen.findByText(`Hỏi ${letter}`));
      await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));
    }
    expect(await screen.findByText('Bạn đã hoàn thành một bài học!')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Học thêm một bài' })).toBeVisible();
    expect(screen.getByLabelText('Tổng kết phiên')).toHaveTextContent('2 thẻ');
    expect(calls.mock.calls.filter(([url]) => url === '/api/practice-sessions')).toHaveLength(1);
  });

  it('Undo câu cuối mở lại bài, không giữ màn hoàn thành', async () => {
    const current = session();
    current.status = 'completed';
    current.closedAt = NOW;
    current.items.forEach((i) => {
      i.answer = { id: `answer-${i.id}`, outcome: 'remembered', reviewedAt: NOW };
    });
    server(current);
    renderWithProviders(<ReviewPage />, { route: '/review?session=lesson-1' });
    await screen.findByText('Bạn đã hoàn thành một bài học!');
    await userEvent.click(screen.getByRole('button', { name: /Hoàn tác/ }));
    expect(await screen.findByText('Hỏi B')).toBeVisible();
    expect(screen.queryByText('Bạn đã hoàn thành một bài học!')).not.toBeInTheDocument();
  });

  it('lưu lỗi giữ nguyên câu và cho phép thử lại', async () => {
    server(session(), true);
    renderWithProviders(<ReviewPage />);
    await userEvent.click(await screen.findByText('Hỏi A'));
    await userEvent.click(screen.getByRole('button', { name: /Nhớ/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được lựa chọn này');
    expect(screen.getByText('1 / 2')).toBeVisible();
  });

  it('không có ứng viên thì không báo hoàn thành bài học', async () => {
    server(null);
    renderWithProviders(<ReviewPage />);
    expect(await screen.findByText('Chưa có thêm thẻ phù hợp')).toBeVisible();
    expect(screen.queryByText('Bạn đã hoàn thành một bài học!')).not.toBeInTheDocument();
  });

  it('lựa chọn bài ngắn gửi size=10 lên API', async () => {
    const calls = server();
    renderWithProviders(<ReviewPage />, { route: '/review?size=10' });
    await screen.findByText('Hỏi A');
    await waitFor(() =>
      expect(JSON.parse(String(calls.mock.calls[0][1]?.body))).toEqual({ size: 10 }),
    );
  });

  it('giữ ghi chú đã định dạng ở mặt sau', async () => {
    const current = session();
    current.items[0].card!.note = 'Mẹo: **từ khoá**';
    server(current);
    renderWithProviders(<ReviewPage />);
    await userEvent.click(await screen.findByText('Hỏi A'));
    expect(screen.getByText('từ khoá', { selector: 'strong' })).toBeVisible();
  });

  it('giữ cách hiển thị thẻ đục lỗ', async () => {
    const current = session();
    current.items[0].card!.front = 'Thủ đô Pháp là [[Paris]]';
    current.items[0].card!.back = '';
    server(current);
    const { container } = renderWithProviders(<ReviewPage />);
    await userEvent.click(await screen.findByRole('img', { name: 'chỗ trống' }));
    expect(container.querySelector('mark')).toHaveTextContent('Paris');
  });

  it('phím Space và mũi tên vẫn chấm và chuyển câu', async () => {
    server();
    renderWithProviders(<ReviewPage />);
    await screen.findByText('Hỏi A');
    await userEvent.keyboard(' {ArrowRight}');
    expect(await screen.findByText('Hỏi B')).toBeVisible();
  });
});
