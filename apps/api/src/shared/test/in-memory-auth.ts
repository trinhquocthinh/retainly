import type { SessionRecord, SessionRepository } from '../../features/auth/application/sessions';
import type {
  SsoIdentity,
  SsoUserRepository,
} from '../../features/auth/application/sign-in-with-sso';
import type {
  LocalUserRepository,
  PasswordHasher,
} from '../../features/auth/application/local-credentials';
import { AppError } from '../../shared/errors';

/** Repository phiên chạy trong bộ nhớ, dùng chung cho test application và route. */
export function inMemorySessions(): SessionRepository & { rows: Map<string, SessionRecord> } {
  const rows = new Map<string, SessionRecord>();

  return {
    rows,
    async create({ tokenHash, ...session }) {
      rows.set(tokenHash, session);
    },
    async findByTokenHash(tokenHash) {
      return rows.get(tokenHash) ?? null;
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
    async findOrCreateBySubject(identity) {
      let id = ids.get(identity.subject);
      if (id === undefined) {
        id = `user-${ids.size + 1}`;
        ids.set(identity.subject, id);
        created.push(identity);
      }
      return { id };
    },
  };
}

type LocalUserRow = { id: string; email: string; passwordHash: string; displayName: string };

/** User nội bộ trong bộ nhớ, id `local-1`, `local-2`, ... theo thứ tự tạo. */
export function inMemoryLocalUsers(): LocalUserRepository & { rows: LocalUserRow[] } {
  const rows: LocalUserRow[] = [];

  return {
    rows,
    async findByEmail(email) {
      const row = rows.find((user) => user.email === email);
      return row === undefined ? null : { id: row.id, passwordHash: row.passwordHash };
    },
    async createLocal(user) {
      if (rows.some((row) => row.email === user.email)) throw new AppError('ERR_EMAIL_TAKEN');
      const row = { id: `local-${rows.length + 1}`, ...user };
      rows.push(row);
      return { id: row.id };
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
