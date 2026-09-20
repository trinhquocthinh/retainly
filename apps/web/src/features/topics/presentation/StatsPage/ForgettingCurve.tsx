/**
 * Minh hoạ khái niệm Ebbinghaus vs FSRS — hình tĩnh, không phải dữ liệu người
 * dùng. Để `aria-hidden` và mô tả bằng chữ ở phần chú thích bên ngoài, tránh
 * trình đọc màn hình đọc một mớ toạ độ vô nghĩa.
 */
export function ForgettingCurve() {
  return (
    <svg
      className="stats-curve__plot"
      viewBox="0 0 640 220"
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* Lưới ngang tại 100 / 75 / 50 / 25 phần trăm */}
      <g className="stats-curve__grid">
        <path d="M60 30h540M60 83h540M60 137h540M60 190h540" />
      </g>

      <g className="stats-curve__axis-label" textAnchor="end">
        <text x="52" y="34">
          100%
        </text>
        <text x="52" y="87">
          75%
        </text>
        <text x="52" y="141">
          50%
        </text>
        <text x="52" y="194">
          25%
        </text>
      </g>

      {/* Ngưỡng ôn lại */}
      <path className="stats-curve__threshold" d="M60 62h540" />

      {/* Quên tự nhiên — trôi thẳng xuống đáy */}
      <path className="stats-curve__natural" d="M60 30C120 110 200 150 320 170S500 188 600 193" />

      {/* Khoảng lặp FSRS — rơi rồi được kéo lại tại mỗi lượt ôn */}
      <path className="stats-curve__spaced" d="M60 30C90 70 120 95 160 105" />
      <path className="stats-curve__spaced" d="M160 30C200 70 240 90 280 100" />
      <path className="stats-curve__spaced" d="M280 30C330 60 380 80 420 92" />
      <path className="stats-curve__stable" d="M420 30C480 42 540 54 600 60" />

      {/* Đường dựng đứng nối đáy với điểm ôn lại */}
      <g className="stats-curve__spike">
        <path d="M160 105V30M280 100V30M420 92V30" />
      </g>

      <g className="stats-curve__marker">
        <circle cx="160" cy="30" r="5" />
        <circle cx="280" cy="30" r="5" />
        <circle cx="420" cy="30" r="5" />
      </g>
      <circle className="stats-curve__marker-stable" cx="600" cy="60" r="5" />

      <g className="stats-curve__axis-label">
        <text x="60" y="212">
          Học mới
        </text>
        <text x="160" y="212" textAnchor="middle">
          Ngày 1
        </text>
        <text x="280" y="212" textAnchor="middle">
          Ngày 4
        </text>
        <text x="420" y="212" textAnchor="middle">
          Ngày 12
        </text>
        <text x="600" y="212" textAnchor="end">
          Ngày 30+
        </text>
      </g>
    </svg>
  );
}
