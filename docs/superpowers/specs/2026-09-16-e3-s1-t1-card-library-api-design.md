# E3-S1-T1 Card Library API Design

- **Status:** Proposed for implementation
- **Date:** 2026-09-16
- **Scope:** Epic 3 — Quản lý Thư viện thẻ & Cascade CRUD
- **Task:** E3-S1-T1 — API danh sách thẻ phân trang và lọc theo nguồn

## 1. Mục tiêu

Bổ sung `GET /api/cards` để màn hình Thư viện thẻ có thể tải danh sách thẻ của người dùng hiện tại theo từng trang, tùy chọn lọc theo nguồn đã tạo thẻ. API phải giữ cô lập dữ liệu theo `userId`, trả thứ tự ổn định và có index phù hợp cho các truy vấn chính.

E3-S1-T1 chỉ cung cấp API đọc danh sách. Sửa thẻ theo SPEC-009, xóa cascade theo SPEC-010 và giao diện Thư viện thuộc các task tiếp theo.

## 2. Hợp đồng HTTP

### Request

```http
GET /api/cards?page=1&pageSize=20&sourceId=<uuid>
```

Query parameters:

| Trường     | Bắt buộc | Mặc định | Ràng buộc                  | Ý nghĩa                      |
| ---------- | -------: | -------: | -------------------------- | ---------------------------- |
| `page`     |    Không |      `1` | Số nguyên `>= 1`           | Trang cần đọc                |
| `pageSize` |    Không |     `20` | Số nguyên từ `1` đến `100` | Số thẻ tối đa trên một trang |
| `sourceId` |    Không |        — | UUID hợp lệ                | Chỉ lấy thẻ thuộc nguồn này  |

Fastify JSON schema từ chối query không hợp lệ bằng HTTP `400` với mã lỗi chuẩn `ERR_BAD_REQUEST`.

### Response thành công

HTTP `200`:

```json
{
  "items": [
    {
      "id": "00000000-0000-0000-0000-000000000001",
      "sourceId": "00000000-0000-0000-0000-0000000000b1",
      "front": "Thủ đô của Pháp?",
      "back": "Paris",
      "createdAt": "2026-09-16T01:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 42,
    "totalPages": 3
  }
}
```

`sourceId` trong từng item có thể là `null`. Response không chứa `userId`, `ReviewSchedule` hoặc `ReviewOutcome` vì màn Thư viện không cần các trường nội bộ này.

Nếu trang nằm ngoài phạm vi hiện có, API vẫn trả HTTP `200`, `items: []` và metadata tổng hợp chính xác. Khi không có thẻ, `totalItems` và `totalPages` đều bằng `0`.

## 3. Quy tắc truy vấn

1. Mọi truy vấn bắt buộc có điều kiện `userId` lấy từ ngữ cảnh người dùng hiện tại. Trong giai đoạn chưa có xác thực, route sử dụng `DEFAULT_USER_ID` giống các API hiện hữu.
2. Khi có `sourceId`, điều kiện truy vấn là đồng thời `userId` và `sourceId`. Một UUID nguồn không tồn tại hoặc thuộc người dùng khác chỉ tạo ra danh sách rỗng; API không xác nhận sự tồn tại của nguồn đó.
3. Kết quả sắp xếp theo `createdAt DESC`, sau đó `id DESC` để thứ tự xác định khi nhiều thẻ có cùng thời điểm tạo.
4. Offset được tính bằng `(page - 1) * pageSize`; Prisma dùng `skip` và `take`.
5. `count` và `findMany` chạy trong cùng một Prisma transaction với isolation level `RepeatableRead` để danh sách và metadata được đọc từ cùng một snapshot.
6. `totalPages` được tính bằng `Math.ceil(totalItems / pageSize)`.

## 4. Kiến trúc và ranh giới trách nhiệm

### Application layer

Tạo `features/cards/application/list-cards.ts` chứa:

- DTO `CardListItem` và `PaginatedCards`.
- Input `ListCardsInput` gồm `userId`, `page`, `pageSize` và `sourceId?`.
- Port `CardListQuery` với phương thức truy vấn phân trang.
- Use case `listCards` điều phối truy vấn và tạo metadata response.

Use case không phụ thuộc Fastify hay Prisma. Giá trị mặc định và giới hạn query thuộc presentation schema; application layer nhận input đã hợp lệ.

### Infrastructure layer

Mở rộng hạ tầng cards bằng một Prisma query adapter thực hiện:

- `where: { userId, sourceId? }`;
- `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`;
- `skip` và `take`;
- `select` đúng năm trường DTO: `id`, `sourceId`, `front`, `back`, `createdAt`;
- transaction `RepeatableRead` gồm `count` và `findMany`.

Adapter trả dữ liệu và tổng số item, không tự xây HTTP response.

### Presentation layer

Mở rộng `registerCardsRoutes` với `GET /api/cards`:

- schema coercion chuyển `page` và `pageSize` từ query string thành số nguyên;
- áp dụng mặc định `page=1`, `pageSize=20`;
- kiểm tra `sourceId` theo format UUID;
- gọi `listCards` với `DEFAULT_USER_ID`;
- trả HTTP `200` cùng DTO phân trang.

Dependency của route được mở rộng để nhận cả command repository tạo thẻ và query adapter danh sách, giữ riêng interface đọc và ghi.

## 5. Index cơ sở dữ liệu

Bổ sung migration Prisma với hai composite index:

```prisma
@@index([userId, createdAt, id])
@@index([userId, sourceId, createdAt, id])
```

Index thứ nhất phục vụ danh sách toàn bộ thẻ theo người dùng và thứ tự thời gian. Index thứ hai phục vụ cùng truy vấn khi có bộ lọc nguồn. Các index đơn hiện có chỉ được loại bỏ nếu migration và kiểm tra truy vấn xác nhận composite index bao phủ đầy đủ nhu cầu cũ; mặc định task này giữ chúng để tránh mở rộng phạm vi tối ưu hóa ngoài E3-S1-T1.

## 6. Xử lý lỗi và bảo mật

- Query sai kiểu, vượt giới hạn hoặc UUID sai trả HTTP `400 ERR_BAD_REQUEST` qua error handler hiện hữu.
- Lỗi hạ tầng không lường trước trả HTTP `500 ERR_INTERNAL`; response không lộ chi tiết Prisma hoặc SQL.
- Route không nhận `userId` từ client, ngăn người gọi thay đổi phạm vi sở hữu.
- Lọc nguồn luôn đi cùng `userId`, tránh rò rỉ thẻ hoặc suy luận nguồn của tài khoản khác.

## 7. Chiến lược kiểm thử

Triển khai theo TDD, mỗi hành vi phải có test thất bại đúng nguyên nhân trước khi viết production code.

### Unit tests

- Use case trả `items` và metadata đúng từ kết quả query.
- `totalPages` làm tròn lên và bằng `0` khi không có item.
- Use case truyền nguyên vẹn `userId`, `sourceId`, `page`, `pageSize` sang query port.

### Route tests

- Query rỗng dùng `page=1`, `pageSize=20` và trả HTTP `200`.
- Query tùy chỉnh truyền đúng pagination và `sourceId`.
- `page < 1`, `pageSize < 1`, `pageSize > 100`, giá trị không phải số nguyên hoặc `sourceId` sai UUID trả `400 ERR_BAD_REQUEST`.
- Route luôn dùng `DEFAULT_USER_ID`, không nhận quyền sở hữu từ request.

### Integration tests với PostgreSQL thật

- Chỉ trả thẻ thuộc đúng user.
- Lọc đúng theo `sourceId` và không lộ dữ liệu nguồn của user khác.
- Phân trang không trùng item, đúng số lượng và đúng tổng số.
- Thứ tự `createdAt DESC, id DESC` ổn định.
- Prisma schema và migration chứa hai composite index đã thiết kế.

## 8. Tiêu chí hoàn thành

- `GET /api/cards` tuân thủ hợp đồng ở mục 2.
- Phân trang, metadata, lọc nguồn, thứ tự và cô lập user hoạt động đúng.
- Migration bổ sung index chạy thành công trên PostgreSQL.
- Test unit, route và integration liên quan đều đạt.
- Toàn bộ `yarn verify` đạt, không phát sinh lỗi typecheck, lint, format, duplication, unused code hoặc build.
