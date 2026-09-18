import { hash, verify } from '@node-rs/argon2';

import type { PasswordHasher } from '../application/local-credentials';

// Mặc định của @node-rs/argon2 là Argon2id m=19 MiB, t=2, p=1 (mức OWASP). Ghi
// rõ ra để lần nâng thư viện sau không lặng lẽ đổi tham số. Đổi tham số thì
// DUMMY_PASSWORD_HASH cũng phải băm lại cho khớp thời gian.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const argon2PasswordHasher: PasswordHasher = {
  hash(password) {
    return hash(password, OPTIONS);
  },

  // Thuật toán và tham số đọc từ chính chuỗi PHC đã lưu.
  verify(passwordHash, password) {
    return verify(passwordHash, password);
  },
};
