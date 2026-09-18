import { AppError } from '../../../shared/errors';
import { MAX_ACTIVE_USERS } from '../domain/user-limit';

export type UserCounter = {
  /** Mọi user trong hệ thống; chưa có khái niệm khoá tài khoản nên tất cả đều "hoạt động". */
  countUsers(): Promise<number>;
};

/**
 * Gọi ngay trước khi tạo user mới. Đếm rồi mới tạo nên hai request song song có
 * thể cùng lọt ở suất cuối và vượt trần 1 user: chấp nhận, vì trần chỉ là ngưỡng
 * quy mô. Muốn chặn tuyệt đối phải khoá (advisory lock) trong transaction.
 */
export async function assertUserSlotAvailable(deps: { userCounter: UserCounter }): Promise<void> {
  if ((await deps.userCounter.countUsers()) >= MAX_ACTIVE_USERS) {
    throw new AppError('ERR_USER_LIMIT_REACHED');
  }
}
