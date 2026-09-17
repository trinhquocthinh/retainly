import type { SessionRecord, SessionRepository } from '../../features/auth/application/sessions';
import type {
  SsoIdentity,
  SsoUserRepository,
} from '../../features/auth/application/sign-in-with-sso';

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
