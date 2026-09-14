#!/usr/bin/env python3
"""Composite the in-game title wordmark onto authorized capsule downscales.

Uses the TitleScreen string and front-door type recipe (serif, weight 600,
ivory ink, dark text shadow). Linux has no Palatino; Liberation Serif is the
installed Times New Roman stand-in named in the CSS fallback stack.
No generative fill, no watermark removal, no new scene art.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PACKET = Path(__file__).resolve().parents[1]
ARTWORK = PACKET / "capsules" / "artwork-only"
TITLED = PACKET / "capsules" / "titled"
WORDMARK = "Our Civic Duty"
INK = (245, 235, 212, 255)
SHADOW = (8, 13, 21, 184)
FONT_PATH = Path("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size=size)


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, start: int) -> ImageFont.FreeTypeFont:
    size = start
    while size > 12:
        font = load_font(size)
        width, _ = text_size(draw, text, font)
        if width <= max_width:
            return font
        size -= 2
    return load_font(12)


def paint_scrim(base: Image.Image, kind: str) -> Image.Image:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = base.size
    if kind == "left":
        for x in range(int(w * 0.62)):
            alpha = int(210 * (1 - x / (w * 0.62)) ** 1.15)
            draw.line([(x, 0), (x, h)], fill=(8, 13, 21, alpha))
    elif kind == "bottom":
        band = int(h * 0.38)
        for y in range(band):
            yy = h - band + y
            alpha = int(200 * (y / band) ** 0.85)
            draw.line([(0, yy), (w, yy)], fill=(8, 13, 21, alpha))
    elif kind == "top":
        band = int(h * 0.42)
        for y in range(band):
            alpha = int(205 * (1 - y / band) ** 1.05)
            draw.line([(0, y), (w, y)], fill=(8, 13, 21, alpha))
    return Image.alpha_composite(base.convert("RGBA"), overlay)


def draw_wordmark(
    image: Image.Image,
    *,
    x: int,
    y: int,
    font: ImageFont.FreeTypeFont,
    lines: list[str] | None = None,
    max_width: int | None = None,
) -> None:
    draw = ImageDraw.Draw(image)
    lines = lines or [WORDMARK]
    cursor_y = y
    for line in lines:
        line_font = font
        if max_width is not None:
            line_font = fit_font(draw, line, max_width, font.size)
        shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(shadow)
        sdraw.text((x, cursor_y + 2), line, font=line_font, fill=SHADOW)
        blurred = shadow.filter(ImageFilter.GaussianBlur(radius=4))
        image.alpha_composite(blurred)
        ImageDraw.Draw(image).text((x, cursor_y), line, font=line_font, fill=INK)
        cursor_y += int(line_font.size * 1.12)


def composite(src_name: str, dest_name: str, layout: str) -> dict:
    src = ARTWORK / src_name
    dest = TITLED / dest_name
    base = paint_scrim(Image.open(src), {
        "header": "left",
        "small": "left",
        "main": "bottom",
        "vertical": "bottom",
        "library": "bottom",
        "library_header": "left",
        "page": "bottom",
        "icon": "left",
    }[layout])
    w, h = base.size
    draw = ImageDraw.Draw(base)
    if layout == "header":
        font = fit_font(draw, WORDMARK, int(w * 0.52), 54)
        draw_wordmark(base, x=28, y=int(h * 0.38), font=font, max_width=int(w * 0.54))
    elif layout == "small":
        font = fit_font(draw, "Civic Duty", int(w * 0.72), 58)
        draw_wordmark(
            base,
            x=16,
            y=int(h * 0.12),
            font=font,
            lines=["Our", "Civic Duty"],
            max_width=int(w * 0.74),
        )
    elif layout == "main":
        font = fit_font(draw, WORDMARK, int(w * 0.7), 72)
        draw_wordmark(base, x=36, y=h - font.size - 48, font=font, max_width=int(w * 0.72))
    elif layout == "vertical":
        font = fit_font(draw, "Our", int(w * 0.78), 72)
        draw_wordmark(
            base,
            x=28,
            y=h - int(font.size * 2.6) - 36,
            font=font,
            lines=["Our", "Civic Duty"],
            max_width=int(w * 0.82),
        )
    elif layout == "library":
        font = fit_font(draw, "Our", int(w * 0.82), 64)
        draw_wordmark(
            base,
            x=24,
            y=h - int(font.size * 2.6) - 28,
            font=font,
            lines=["Our", "Civic Duty"],
            max_width=int(w * 0.86),
        )
    elif layout == "library_header":
        font = fit_font(draw, WORDMARK, int(w * 0.52), 54)
        draw_wordmark(base, x=28, y=int(h * 0.38), font=font, max_width=int(w * 0.54))
    elif layout == "page":
        font = fit_font(draw, WORDMARK, int(w * 0.45), 42)
        draw_wordmark(base, x=28, y=h - font.size - 36, font=font, max_width=int(w * 0.5))
    rgb = base.convert("RGB")
    dest.parent.mkdir(parents=True, exist_ok=True)
    rgb.save(dest, "PNG", optimize=True)
    return {
        "file": dest.name,
        "bytes": dest.stat().st_size,
        "sha256": sha256(dest),
        "size": f"{rgb.size[0]}x{rgb.size[1]}",
        "source": src_name,
    }


def library_logo() -> dict:
    dest = TITLED / "ocd_library_logo_1280x720.png"
    canvas = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    font = fit_font(draw, WORDMARK, 1180, 140)
    width, height = text_size(draw, WORDMARK, font)
    x = (1280 - width) // 2
    y = (720 - height) // 2
    draw_wordmark(canvas, x=x, y=y, font=font)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)
    return {
        "file": dest.name,
        "bytes": dest.stat().st_size,
        "sha256": sha256(dest),
        "size": "1280x720",
        "source": "front-door wordmark on transparent field",
    }


def icons() -> list[dict]:
    header = Image.open(ARTWORK / "header_capsule_920x430_artwork_only.png")
    crop = header.crop((0, 0, 430, 430)).resize((256, 256), Image.Resampling.LANCZOS)
    titled = paint_scrim(crop, "left")
    draw = ImageDraw.Draw(titled)
    font = fit_font(draw, "Our", 220, 48)
    draw_wordmark(
        titled,
        x=12,
        y=70,
        font=font,
        lines=["Our", "Civic", "Duty"],
        max_width=228,
    )
    png = TITLED / "ocd_shortcut_icon_256x256.png"
    jpg = TITLED / "ocd_app_icon_184x184.jpg"
    titled.convert("RGB").save(png, "PNG", optimize=True)
    titled.resize((184, 184), Image.Resampling.LANCZOS).convert("RGB").save(
        jpg, "JPEG", quality=92, optimize=True
    )
    return [
        {
            "file": png.name,
            "bytes": png.stat().st_size,
            "sha256": sha256(png),
            "size": "256x256",
            "source": "header artwork crop + wordmark",
        },
        {
            "file": jpg.name,
            "bytes": jpg.stat().st_size,
            "sha256": sha256(jpg),
            "size": "184x184",
            "source": "header artwork crop + wordmark",
        },
    ]


def copy_hero() -> dict:
    src = ARTWORK / "library_hero_3840x1240_artwork_only.png"
    return {
        "file": "library_hero_3840x1240_artwork_only.png",
        "bytes": src.stat().st_size,
        "sha256": sha256(src),
        "size": "3840x1240",
        "source": src.name,
        "note": "library hero must contain no text; upload the artwork-only file as ocd_library_hero_3840x1240.png",
    }


def main() -> None:
    if not FONT_PATH.is_file():
        raise SystemExit(f"missing font {FONT_PATH}")
    TITLED.mkdir(parents=True, exist_ok=True)
    records = [
        composite("header_capsule_920x430_artwork_only.png", "ocd_header_capsule_920x430.png", "header"),
        composite("small_capsule_462x174_artwork_only.png", "ocd_small_capsule_462x174.png", "small"),
        composite("main_capsule_1232x706_artwork_only.png", "ocd_main_capsule_1232x706.png", "main"),
        composite("vertical_capsule_748x896_artwork_only.png", "ocd_vertical_capsule_748x896.png", "vertical"),
        composite("library_capsule_600x900_artwork_only.png", "ocd_library_capsule_600x900.png", "library"),
        composite("library_header_920x430_artwork_only.png", "ocd_library_header_920x430.png", "library_header"),
        composite("page_background_1438x810_artwork_only.png", "ocd_page_background_1438x810.png", "page"),
        copy_hero(),
        library_logo(),
        *icons(),
    ]
    (TITLED / "hashes.json").write_text(json.dumps(records, indent=2) + "\n")
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
