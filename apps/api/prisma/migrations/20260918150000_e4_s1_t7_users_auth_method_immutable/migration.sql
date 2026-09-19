-- BR-022 vế "không thay đổi sau khi khởi tạo". CHECK constraint chỉ nhìn một
-- dòng tại một thời điểm nên không phân biệt được "tạo mới" với "sửa"; cần
-- trigger so OLD với NEW.
--
-- Chặn: đổi external_auth_id (định danh SSO), và chuyển giữa có / không có
-- password_hash (đổi phương thức). Vẫn cho: đổi mật khẩu (hash cũ → hash mới),
-- đổi email, đổi display_name.
CREATE FUNCTION "users_auth_method_immutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."external_auth_id" IS DISTINCT FROM OLD."external_auth_id"
    OR (NEW."password_hash" IS NULL) <> (OLD."password_hash" IS NULL) THEN
    RAISE EXCEPTION 'users_auth_method_immutable: không được đổi phương thức xác thực của user %', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "users_auth_method_immutable_trg"
BEFORE UPDATE OF "external_auth_id", "password_hash" ON "users"
FOR EACH ROW EXECUTE FUNCTION "users_auth_method_immutable"();