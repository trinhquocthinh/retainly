export const errorCatalog = {
  // SDD — bảng mã lỗi chung
  ERR_INVALID_URL: { status: 400, message: 'Đường dẫn không hợp lệ, kiểm tra lại URL' },
  ERR_FETCH_FAILED: { status: 502, message: 'Không tải được nội dung từ URL này' },
  ERR_FETCH_TIMEOUT: { status: 504, message: 'Tải nội dung quá lâu, thử lại sau' },
  ERR_EMPTY_FRONT: { status: 400, message: 'Mặt hỏi của thẻ không được để trống' },
  ERR_EMPTY_BACK: { status: 400, message: 'Mặt trả lời của thẻ không được để trống' },
  ERR_TOPIC_NOT_FOUND: { status: 404, message: 'Không tìm thấy nhánh kiến thức này' },
  ERR_SOURCE_NOT_FOUND: { status: 404, message: 'Không tìm thấy nguồn bài viết này' },
  ERR_CARD_NOT_FOUND: { status: 404, message: 'Không tìm thấy thẻ này' },
  ERR_UNAUTHORIZED: { status: 401, message: 'Vui lòng đăng nhập lại' },
  ERR_INVALID_OUTCOME: { status: 400, message: 'Kết quả ôn tập không hợp lệ' },
  ERR_FORBIDDEN: { status: 403, message: 'Bạn không có quyền truy cập nội dung này' },
  ERR_USER_LIMIT_REACHED: { status: 403, message: 'Đã đạt giới hạn số tài khoản cho phép' },
  ERR_EMAIL_TAKEN: { status: 409, message: 'Email này đã được đăng ký' },
  ERR_WEAK_PASSWORD: {
    status: 400,
    message: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký hiệu',
  },
  ERR_INVALID_CREDENTIALS: { status: 401, message: 'Email hoặc mật khẩu không đúng' },

  // Hạ tầng — chưa có trong SDD, xem ghi chú cuối bài
  ERR_BAD_REQUEST: { status: 400, message: 'Yêu cầu không hợp lệ' },
  ERR_NOT_FOUND: { status: 404, message: 'Không tìm thấy đường dẫn này' },
  ERR_INTERNAL: { status: 500, message: 'Có lỗi xảy ra, thử lại sau' },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof errorCatalog;

export class AppError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = 'AppError';
  }
}
