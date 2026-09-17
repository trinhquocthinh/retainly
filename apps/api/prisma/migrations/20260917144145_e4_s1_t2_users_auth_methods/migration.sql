/*
  Warnings:

  - A unique constraint covering the columns `[external_auth_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" TEXT,
ADD COLUMN     "external_auth_id" TEXT,
ADD COLUMN     "password_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_external_auth_id_key" ON "users"("external_auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Backfill (BR-022): user mặc định của giai đoạn 1 chưa có phương thức xác thực
-- nên sẽ vi phạm CHECK bên dưới. Gán tạm định danh SSO; E4-S1-T3 thay bằng `sub`
-- thật của chủ dự án trong lần đăng nhập Authentik đầu tiên, giữ nguyên dữ liệu cũ.
UPDATE "users"
SET "external_auth_id" = 'legacy:default-owner'
WHERE "id" = '00000000-0000-0000-0000-000000000001'
  AND "external_auth_id" IS NULL
  AND "password_hash" IS NULL;

-- AddCheckConstraint (BR-022): đúng một phương thức xác thực mỗi user.
-- Tài khoản nội bộ bắt buộc có email; user SSO được phép lưu email từ Authentik.
ALTER TABLE "users" ADD CONSTRAINT "users_exactly_one_auth_method_chk" CHECK (
  ("password_hash" IS NOT NULL AND "email" IS NOT NULL AND "external_auth_id" IS NULL)
  OR
  ("external_auth_id" IS NOT NULL AND "password_hash" IS NULL)
);