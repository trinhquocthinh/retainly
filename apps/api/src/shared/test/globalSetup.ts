import { execFileSync } from 'node:child_process';
import { Client } from 'pg';

import { TEST_DATABASE_NAME, testDatabaseUrl } from './databaseUrl';

/** Chạy đúng một lần trước toàn bộ nhóm integration. */
export default async function setup(): Promise<void> {
  const adminUrl = new URL(testDatabaseUrl());
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  const existing = await client.query('select 1 from pg_database where datname = $1', [
    TEST_DATABASE_NAME,
  ]);
  if (existing.rowCount === 0) {
    // Không tham số hoá được tên database, và cũng không cần: hằng số trong repo.
    await client.query(`create database "${TEST_DATABASE_NAME}"`);
  }

  await client.end();

  // Dùng chính migration của production. Tự viết schema cho test là cách chắc
  // chắn nhất để test xanh trên một schema mà production không bao giờ có.
  // `yarn workspace api` chạy đúng dù thư mục làm việc là gốc repo hay
  // apps/api — vitest khởi động globalSetup với cwd của tiến trình gọi nó.
  execFileSync('yarn', ['workspace', 'api', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });
}
