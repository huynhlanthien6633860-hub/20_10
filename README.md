# Thiệp 20/10 – bản gửi tặng

Hai trang riêng, dùng chung nhạc và giao diện:

| File | Xưng hô | Ký tên |
|---|---|---|
| `em.html`  | anh → em  | — Anh Lân |
| `cau.html` | tui → cậu | — Lân |

- Nhạc nền: `music.mp3`, phát lặp vô hạn, không có nút tắt/mở. Trình duyệt chặn tự phát tiếng nên nhạc bắt đầu ở lần chạm đầu tiên (nút "Mở món quà").
- Không có phần tuỳ chỉnh, không thu thập dữ liệu.

## Xem thử
`cd` vào thư mục rồi chạy `python3 -m http.server 8000`, mở http://localhost:8000/em.html và /cau.html.

## Đưa lên mạng (Cloudflare Pages)
Dashboard → Workers & Pages → Create → Pages → Upload assets → kéo cả thư mục này vào.
Link gửi đi: `https://TEN-BAN.pages.dev/em` và `https://TEN-BAN.pages.dev/cau`.

## Muốn sửa
Tên, lời chúc, câu chuyện: phần CONFIG đầu `script.js`. Đổi nhạc: thay `music.mp3`.
