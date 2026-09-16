import { lookup as dnsLookup } from 'node:dns';

import { Agent, fetch as undiciFetch } from 'undici';

import { AppError } from '../../../shared/errors';
import { isPublicUnicastAddress } from '../domain/private-address';
import { parseSourceUrl } from '../domain/source-url';

const MAX_REDIRECTS = 5;
const MAX_BYTES = 2_000_000;
const USER_AGENT = 'RetainlyBot/0.1 (+https://retainly.toniboy.io.vn)';
const BLOCKED_PREFIX = 'SSRF_BLOCKED';

export type SafeFetcher = (url: string) => Promise<Response>;

/**
 * SSRF Guard tầng kết nối. Đặt ngay trong `connect.lookup` của undici nên lần
 * phân giải DNS dùng để kiểm tra CHÍNH LÀ lần phân giải mở socket — bịt khe
 * TOCTOU của kiểu "lookup trước rồi fetch sau" (tấn công DNS rebinding: TTL=0,
 * trả IP công khai lần hỏi thứ nhất và 127.0.0.1 ở lần thứ hai).
 */
const guardedAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error, '');

        const blocked = addresses.find((record) => !isPublicUnicastAddress(record.address));
        if (blocked) {
          return callback(new Error(`${BLOCKED_PREFIX}:${blocked.address}`), '');
        }

        return callback(null, addresses);
      });
    },
  },
});

/** Phân loại nguyên nhân gốc do undici bọc trong `TypeError: fetch failed`. */
function causeChain(error: unknown): Error[] {
  const chain: Error[] = [];
  let current: unknown = error;
  while (current instanceof Error && chain.length < 5) {
    chain.push(current);
    current = current.cause;
  }
  return chain;
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const chain = causeChain(error);
  if (chain.some((e) => e.message.startsWith(BLOCKED_PREFIX))) {
    return new AppError('ERR_INVALID_URL');
  }
  if (chain.some((e) => e.name === 'TimeoutError' || e.name === 'AbortError')) {
    return new AppError('ERR_FETCH_TIMEOUT');
  }
  return new AppError('ERR_FETCH_FAILED');
}

/**
 * Chỉ mô tả phần stream thực sự dùng tới: `ReadableStream` của undici và của
 * lib DOM khai báo lệch nhau, nên bám theo cấu trúc thay vì kiểu cụ thể.
 */
type ByteStream = {
  getReader(): {
    read(): Promise<{ done: boolean; value?: Uint8Array }>;
    cancel(): Promise<void>;
  };
};

/** Đọc body có trần dung lượng, chặn nguồn trả về stream khổng lồ làm cạn RAM. */
async function readCapped(body: ByteStream | null): Promise<ArrayBuffer> {
  const chunks: Uint8Array[] = [];
  let total = 0;

  if (body !== null) {
    const reader = body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        total += value.byteLength;
        if (total > MAX_BYTES) throw new AppError('ERR_FETCH_FAILED');
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  }

  const buffer = new ArrayBuffer(total);
  const view = new Uint8Array(buffer);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}

/**
 * Fetcher an toàn dùng cho article-extractor. `timeoutMs` là ngân sách cho
 * TOÀN BỘ chuỗi redirect, không phải cho từng chặng, nên một nguồn chậm không
 * thể giữ request Fastify lâu gấp số chặng.
 */
export function createSafeFetcher(timeoutMs: number): SafeFetcher {
  return async (input: string): Promise<Response> => {
    const deadline = AbortSignal.timeout(timeoutMs);
    let target = parseSourceUrl(input);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const response = await undiciFetch(target, {
        redirect: 'manual',
        signal: deadline,
        dispatcher: guardedAgent,
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
      }).catch((error: unknown) => {
        throw toAppError(error);
      });

      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location !== null) {
        await response.body?.cancel().catch(() => undefined);
        // parseSourceUrl chạy lại mọi luật domain cho hop mới: scheme, port, IP literal.
        target = parseSourceUrl(new URL(location, target).toString());
        continue;
      }

      if (response.status >= 400) throw new AppError('ERR_FETCH_FAILED');

      const body = await readCapped(response.body).catch((error: unknown) => {
        throw toAppError(error);
      });
      // Giữ lại content-type để bước dò charset của extractor không mất manh mối.
      const contentType = response.headers.get('content-type');
      return new Response(body, {
        status: response.status,
        headers: contentType === null ? undefined : { 'content-type': contentType },
      });
    }

    throw new AppError('ERR_FETCH_FAILED');
  };
}
