/**
 * User seed cố định của v0.1 giai đoạn 1, dùng thay cho phiên đăng nhập thật.
 * Xoá cùng lúc với E4-S1-T3 khi middleware xác thực có mặt.
 */
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Định danh SSO tạm mà migration e4_s1_t2 gán cho user mặc định để thoả CHECK
 * BR-022. E4-S1-T3 thay bằng `sub` Authentik thật của chủ dự án.
 */
export const DEFAULT_USER_EXTERNAL_AUTH_ID = 'legacy:default-owner';
