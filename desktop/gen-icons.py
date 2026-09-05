#!/usr/bin/env python3
"""Generate the CLEANPLATE desktop icon set from the brand monogram.

Icons are build artifacts, not committed. Run once before `tauri build`:

    pip install pillow
    python desktop/gen-icons.py

Writes src-tauri/icons/{32x32,128x128,128x128@2x,icon}.png. For the full
platform set (.icns / .ico) run `npm run tauri icon src-tauri/icons/icon.png`.
"""
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
OUT = HERE / "src-tauri" / "icons"

BG = (8, 9, 11, 255)        # --bg-void
BORDER = (35, 39, 46, 255)  # --border
AMBER = (255, 176, 32, 255) # --accent


def monogram(size: int) -> Image.Image:
    scale = 8
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(s * 0.125)  # 4px radius on the 32px mark, kept proportional
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=BG, outline=BORDER, width=max(1, scale))
    m = s * 0.30
    d.polygon([(s * 0.36, m), (s * 0.72, s * 0.5), (s * 0.36, s - m)], fill=AMBER)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name in [(32, "32x32.png"), (128, "128x128.png"),
                       (256, "128x128@2x.png"), (512, "icon.png")]:
        monogram(size).save(OUT / name)
    print("wrote:", ", ".join(p.name for p in sorted(OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
