"""Web 版のアイコン（PNG）を作る。標準ライブラリだけで動く。

青い背景に、ヒット（緑）とブロー（黄）を表す丸を 2×2 で並べる。
丸は中央 80% の範囲に収めているので、Android で丸や角丸に切り抜かれても欠けない。

使い方: python3 tools/make_icons.py
"""

import struct
import zlib
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "web" / "icons"
SIZES = [180, 192, 512]
SUPERSAMPLE = 4  # 1 ピクセルを 4×4 に分けて塗り、縁をなめらかにする

BACKGROUND = (31, 111, 235)
# (中心 x, 中心 y, 色)。座標はアイコンの幅を 1 とした割合
CIRCLES = [
    (0.36, 0.36, (63, 185, 80)),
    (0.64, 0.36, (63, 185, 80)),
    (0.36, 0.64, (210, 153, 34)),
    (0.64, 0.64, (255, 255, 255)),
]
RADIUS = 0.11


def pixel_color(x: float, y: float) -> tuple[int, int, int]:
    for cx, cy, color in CIRCLES:
        if (x - cx) ** 2 + (y - cy) ** 2 <= RADIUS**2:
            return color
    return BACKGROUND


def render(size: int) -> bytes:
    rows = []
    n = SUPERSAMPLE
    for py in range(size):
        row = bytearray([0])  # 各行の先頭はフィルタの種類（0 = なし）
        for px in range(size):
            total = [0, 0, 0]
            for sy in range(n):
                for sx in range(n):
                    color = pixel_color((px + (sx + 0.5) / n) / size, (py + (sy + 0.5) / n) / size)
                    for i in range(3):
                        total[i] += color[i]
            row.extend(round(t / (n * n)) for t in total)
        rows.append(bytes(row))
    return b"".join(rows)


def png(size: int, raw: bytes) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8 bit RGB
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUT_DIR / f"icon-{size}.png"
        path.write_bytes(png(size, render(size)))
        print(f"wrote {path.relative_to(OUT_DIR.parent.parent)}")


if __name__ == "__main__":
    main()
