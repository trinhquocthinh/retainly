import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

import { testDatabaseUrl } from './src/shared/test/databaseUrl.mts';

// Nạp .env của apps/api. Hai đường dẫn để chạy được cả khi vitest khởi động từ
// gốc repo (yarn test) lẫn từ trong workspace — `dotenv/config` mặc định chỉ
// nhìn thư mục làm việc, nên từ gốc nó sẽ nạp nhầm .env ở gốc, file không có
// DATABASE_URL.
config({ path: ['apps/api/.env', '.env'] });

// Đè luôn ở tiến trình chính để globalSetup nhìn thấy DB test. `test.env` bên
// dưới chỉ áp cho worker chạy test, không áp cho globalSetup.
process.env['DATABASE_URL'] = testDatabaseUrl();

export default defineConfig({
  test: {
    name: 'api-integration',
    environment: 'node',
    include: ['src/**/*.itest.ts'],
    globalSetup: ['./src/shared/test/globalSetup.ts'],
    // Cùng một database thì chạy song song sẽ giẫm lên nhau khi TRUNCATE.
    fileParallelism: false,
    // Đè DATABASE_URL để shared/prisma.ts của production code cũng trỏ vào DB
    // test. Thiếu dòng này, test sẽ lặng lẽ ghi vào database dev.
    env: { DATABASE_URL: testDatabaseUrl() },
  },
});
