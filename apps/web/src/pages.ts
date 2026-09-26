import { matchPath } from 'react-router';

import { lazyPage } from '@src/shared/utils/lazyPage';

// Mỗi màn một chunk riêng: vào /login không phải tải bộ ôn tập, vào app rồi
// không phải tải lại zod/TanStack Form. Giữ bundle đầu dưới mốc 500 kB của Vite.
export const LoginPage = lazyPage(() =>
  import('@src/features/auth/presentation/pages/LoginPage/LoginPage').then((m) => m.LoginPage),
);
export const ReviewPage = lazyPage(() =>
  import('@src/features/review/presentation/pages/ReviewPage/ReviewPage').then((m) => m.ReviewPage),
);
export const CardLibraryPage = lazyPage(() =>
  import('@src/features/cards/presentation/pages/CardLibraryPage/CardLibraryPage').then(
    (m) => m.CardLibraryPage,
  ),
);
export const CreateCardPage = lazyPage(() =>
  import('@src/features/cards/presentation/pages/CreateCardPage/CreateCardPage').then(
    (m) => m.CreateCardPage,
  ),
);
export const StatsPage = lazyPage(() =>
  import('@src/features/stats/presentation/pages/StatsPage/StatsPage').then((m) => m.StatsPage),
);
export const AccountPage = lazyPage(() =>
  import('@src/features/auth/presentation/pages/AccountPage/AccountPage').then(
    (m) => m.AccountPage,
  ),
);
export const HomePage = lazyPage(() =>
  import('@src/features/review/presentation/pages/HomePage/HomePage').then((m) => m.HomePage),
);

const PAGE_ROUTES = [
  ['/login', LoginPage],
  ['/review/*', ReviewPage],
  ['/', HomePage],
  ['/cards', CardLibraryPage],
  ['/cards/new', CreateCardPage],
  ['/stats', StatsPage],
  ['/account', AccountPage],
] as const;

/**
 * Tải chunk của màn đang mở trước khi render, song song với `/api/session`:
 * màn cần đăng nhập chỉ render sau khi phiên trả về, đợi tới lúc đó mới tải
 * thì chunk nối đuôi thêm một vòng mạng. Không bao giờ reject: tải hỏng thì
 * lúc render lazy() tải lại và báo lỗi như thường.
 */
export async function preloadPage(pathname: string): Promise<void> {
  const page = PAGE_ROUTES.find(([pattern]) => matchPath(pattern, pathname))?.[1];
  try {
    await page?.preload();
  } catch {
    // Để lazy() xử lý khi render.
  }
}
