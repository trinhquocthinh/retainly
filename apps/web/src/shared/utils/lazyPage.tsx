import { lazy, useState, type ComponentType } from 'react';

/**
 * Như `lazy()`, thêm `preload()` để tải chunk từ sớm (NFR-1, E12-S1-T2).
 *
 * `lazy()` luôn treo ở lần render đầu kể cả khi chunk đã tải xong, và React 19
 * giữ fallback của Suspense tối thiểu 300 ms rồi mới hiện nội dung — query của
 * màn chỉ bắt đầu gọi sau đó. Chunk đã có sẵn thì render thẳng, không qua lazy.
 */
export function lazyPage<P extends object>(load: () => Promise<ComponentType<P>>) {
  let loaded: ComponentType<P> | undefined;
  const preload = () =>
    load().then((component) => {
      loaded = component;
      return component;
    });
  const LazyPage = lazy(() => preload().then((component) => ({ default: component })));

  function Page(props: P) {
    // Chốt một lần mỗi lần mount: đổi kiểu component giữa chừng sẽ mount lại cả màn.
    const [Component] = useState<ComponentType<P>>(() => loaded ?? LazyPage);
    return <Component {...props} />;
  }

  return Object.assign(Page, { preload });
}
