import type { SessionRecord, SessionRepository } from '../../features/auth/application/sessions';
import type {
  SsoIdentity,
  SsoUserRepository,
} from '../../features/auth/application/sign-in-with-sso';
import type {
  LocalUserRepository,
  PasswordHasher,
} from '../../features/auth/application/local-credentials';
import type { UserCounter } from '../../features/auth/application/user-limit';
import { AppError } from '../../shared/errors';

/** Repository phiên chạy trong bộ nhớ, dùng chung cho test application và route. */
export function inMemorySessions(): SessionRepository & { rows: Map<string, SessionRecord> } {
  const rows = new Map<string, SessionRecord>();

  return {
    rows,
    async create({ tokenHash, ...session }) {
      rows.set(tokenHash, session);
    },
    // Không giữ bảng user nên tên hiển thị và cách đăng nhập suy từ userId
    // (`local-*` do inMemoryLocalUsers tạo) — đủ để test thấy chúng đi qua.
    async findByTokenHash(tokenHash) {
      const session = rows.get(tokenHash);
      return session === undefined
        ? null
        : {
            ...session,
            displayName: `Người dùng ${session.userId}`,
            authMethod: session.userId.startsWith('local-') ? 'local' : 'sso',
          };
    },
    async deleteByTokenHash(tokenHash) {
      rows.delete(tokenHash);
    },
  };
}

/** Mỗi subject mới nhận id `user-1`, `user-2`, ... theo thứ tự tạo. */
export function inMemorySsoUsers(): SsoUserRepository & { created: SsoIdentity[] } {
  const ids = new Map<string, string>();
  const created: SsoIdentity[] = [];

  return {
    created,
    async findBySubject(subject) {
      const id = ids.get(subject);
      return id === undefined ? null : { id };
    },
    async createSso(identity) {
      const id = `user-${ids.size + 1}`;
      ids.set(identity.subject, id);
      created.push(identity);
      return { id };
    },
  };
}

/** Bộ đếm user cố định; test đổi `total` để giả lập hệ thống đã đầy hay còn suất. */
export function userCounterAt(total: number): UserCounter & { total: number } {
  return {
    total,
    async countUsers() {
      return this.total;
    },
  };
}

type LocalUserRow = { id: string; email: string; passwordHash: string; displayName: string };

/**
 * User nội bộ trong bộ nhớ, id `local-1`, `local-2`, ... theo thứ tự tạo. Truyền
 * `sessions` vào thì `replacePassword` huỷ luôn phiên (trừ phiên được giữ) như
 * transaction thật.
 */
export function inMemoryLocalUsers(sessions?: {
  rows: Map<string, SessionRecord>;
}): LocalUserRepository & { rows: LocalUserRow[] } {
  const rows: LocalUserRow[] = [];

  return {
    rows,
    async findByEmail(email) {
      const row = rows.find((user) => user.email === email);
      return row === undefined ? null : { id: row.id, passwordHash: row.passwordHash };
    },
    async findById(id) {
      const row = rows.find((user) => user.id === id);
      return row === undefined ? null : { id: row.id, passwordHash: row.passwordHash };
    },
    async createLocal(user) {
      if (rows.some((row) => row.email === user.email)) throw new AppError('ERR_EMAIL_TAKEN');
      const row = { id: `local-${rows.length + 1}`, ...user };
      rows.push(row);
      return { id: row.id };
    },
    async replacePassword(userId, passwordHash, options) {
      const row = rows.find((user) => user.id === userId);
      if (row !== undefined) row.passwordHash = passwordHash;

      for (const [tokenHash, session] of sessions?.rows ?? []) {
        if (session.userId === userId && tokenHash !== options?.keepSessionTokenHash) {
          sessions?.rows.delete(tokenHash);
        }
      }
    },
  };
}

/** Hasher giả: không tốn CPU như Argon2, nhưng vẫn ghi lại mọi lần verify để test chống dò. */
export function fakePasswordHasher(): PasswordHasher & { verified: string[] } {
  const verified: string[] = [];

  return {
    verified,
    async hash(password) {
      return `hashed:${password}`;
    },
    async verify(passwordHash, password) {
      verified.push(passwordHash);
      return passwordHash === `hashed:${password}`;
    },
  };
}
