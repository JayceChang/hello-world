#!/usr/bin/env python3

import argparse
import math
import os
import random
import sys
from typing import Optional, Tuple

from PIL import Image, ImageChops, ImageFilter

try:
    # Pillow >= 10
    from PIL.Image import Resampling, Transpose
except Exception:  # pragma: no cover
    # Fallback for older Pillow
    class Resampling:
        NEAREST = Image.NEAREST
        BILINEAR = Image.BILINEAR
        BICUBIC = Image.BICUBIC
        LANCZOS = Image.LANCZOS

    class Transpose:
        ROTATE_90 = Image.ROTATE_90
        ROTATE_180 = Image.ROTATE_180
        ROTATE_270 = Image.ROTATE_270


PRESETS = {
    "4k": (3840, 2160),
    "1440p": (2560, 1440),
    "1080p": (1920, 1080),
    # Common ultrawide 21:9
    "ultrawide": (3440, 1440),
}

DEFAULT_START = "#0B1220"  # 深蓝黑
DEFAULT_END = "#1A2233"  # 炭蓝灰


def parse_hex_color(value: str) -> Tuple[int, int, int]:
    s = value.strip().lstrip("#")
    if len(s) != 6 or any(c not in "0123456789aAbBcCdDeEfF" for c in s):
        raise argparse.ArgumentTypeError(
            f"Invalid color '{value}'. Expect hex like #0B1220"
        )
    r = int(s[0:2], 16)
    g = int(s[2:4], 16)
    b = int(s[4:6], 16)
    return (r, g, b)


def float_in_range(min_v: float, max_v: float):
    def _inner(x: str) -> float:
        try:
            v = float(x)
        except Exception:
            raise argparse.ArgumentTypeError(f"Expected a number in [{min_v}, {max_v}]")
        if not (min_v <= v <= max_v):
            raise argparse.ArgumentTypeError(
                f"Value {v} out of range. Expect [{min_v}, {max_v}]"
            )
        return v

    return _inner


def non_negative_float(x: str) -> float:
    try:
        v = float(x)
    except Exception:
        raise argparse.ArgumentTypeError("Expected a non-negative number")
    if v < 0:
        raise argparse.ArgumentTypeError("Expected a non-negative number")
    return v


def positive_int(x: str) -> int:
    try:
        v = int(x)
    except Exception:
        raise argparse.ArgumentTypeError("Expected a positive integer")
    if v <= 0:
        raise argparse.ArgumentTypeError("Expected a positive integer")
    return v


def create_linear_gradient(diag: int, start_rgb: Tuple[int, int, int], end_rgb: Tuple[int, int, int]) -> Image.Image:
    # Build horizontal L mask 0..255 left->right using Pillow's high-quality gradient
    mask = Image.linear_gradient("L").resize((diag, diag), Resampling.LANCZOS)
    mask = mask.transpose(Transpose.ROTATE_270)  # left to right

    start_img = Image.new("RGB", (diag, diag), start_rgb)
    end_img = Image.new("RGB", (diag, diag), end_rgb)
    grad = Image.composite(end_img, start_img, mask)
    return grad


def rotate_and_crop(img: Image.Image, width: int, height: int, angle_deg: float) -> Image.Image:
    diag = max(img.size)
    # rotate within square canvas to avoid clipping, then center-crop
    rotated = img.rotate(angle_deg % 360.0, resample=Resampling.BICUBIC, expand=False)

    cx = cy = diag // 2
    left = int(cx - width / 2)
    top = int(cy - height / 2)
    right = left + width
    bottom = top + height
    return rotated.crop((left, top, right, bottom))


def build_vignette_map(width: int, height: int, strength: float, gamma: float = 1.5) -> Image.Image:
    # Base radial gradient: center black (0) -> edges white (255)
    radial = Image.radial_gradient("L").resize((width, height), Resampling.LANCZOS)
    # Build LUT for mapping radial intensity to brightness multiplier map
    # map_val = 255 * (1 - strength * (r_norm ** gamma))
    lut = []
    for i in range(256):
        r_norm = i / 255.0
        v = 255.0 * (1.0 - strength * (r_norm ** gamma))
        lut.append(int(max(0, min(255, round(v)))))
    vig_map = radial.point(lut)
    return vig_map


def apply_vignette(img: Image.Image, strength: float) -> Image.Image:
    if strength <= 0:
        return img
    w, h = img.size
    vig_map = build_vignette_map(w, h, strength)
    vig_rgb = Image.merge("RGB", (vig_map, vig_map, vig_map))
    return ImageChops.multiply(img, vig_rgb)


def seeded_randbytes(length: int, seed: int) -> bytes:
    r = random.Random(seed)
    # Python 3.9+
    if hasattr(r, "randbytes"):
        return r.randbytes(length)
    # Fallback (slower)
    out = bytearray(length)
    for i in range(length):
        out[i] = r.getrandbits(8)
        # Micro-optimization: unrolled loop would not help much here
    return bytes(out)


def add_grain(img: Image.Image, strength: float, seed: Optional[int]) -> Image.Image:
    if strength <= 0:
        return img
    w, h = img.size
    # Use seeded uniform noise [0,255]
    if seed is None:
        seed = random.SystemRandom().randrange(0, 2**31 - 1)
    noise_bytes = seeded_randbytes(w * h, seed)
    noise = Image.frombytes("L", (w, h), noise_bytes)

    # Scale noise around 128 by factor k, so that 128 means no change
    # k controls amplitude: max delta ~= 128*k
    k = max(0.0, float(strength)) * 2.0  # small boost for perceptibility
    if k > 1.0:
        k = 1.0
    lut = [int(max(0, min(255, round(128 + k * (i - 128))))) for i in range(256)]
    noise_scaled = noise.point(lut)

    noise_rgb = Image.merge("RGB", (noise_scaled, noise_scaled, noise_scaled))
    # Add noise, centering around -128 offset so mid-gray has no effect
    out = ImageChops.add(img, noise_rgb, scale=1.0, offset=-128)
    return out


def ensure_output_dir(path: str) -> None:
    directory = os.path.dirname(path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "生成深色极简渐变桌面壁纸（PNG）。默认 4K，支持配色、角度、颗粒与暗角。"
        )
    )
    parser.add_argument(
        "--preset",
        choices=sorted(PRESETS.keys()),
        default="4k",
        help="常用分辨率预设（默认 4k）",
    )
    parser.add_argument("--width", type=positive_int, help="自定义宽度（像素）")
    parser.add_argument("--height", type=positive_int, help="自定义高度（像素）")
    parser.add_argument(
        "--start",
        type=parse_hex_color,
        default=parse_hex_color(DEFAULT_START),
        help=f"起始颜色十六进制（默认 {DEFAULT_START})",
    )
    parser.add_argument(
        "--end",
        type=parse_hex_color,
        default=parse_hex_color(DEFAULT_END),
        help=f"结束颜色十六进制（默认 {DEFAULT_END})",
    )
    parser.add_argument(
        "--angle",
        type=float,
        default=35.0,
        help="渐变角度（度数，默认 35）",
    )
    parser.add_argument(
        "--grain",
        type=float_in_range(0.0, 1.0),
        default=0.06,
        help="颗粒强度（0~1，默认 0.06）",
    )
    parser.add_argument(
        "--vignette",
        type=float_in_range(0.0, 1.0),
        default=0.2,
        help="暗角强度（0~1，默认 0.2）",
    )
    parser.add_argument(
        "--blur",
        type=non_negative_float,
        default=0.0,
        help="可选高斯模糊半径（默认 0 关闭）",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="随机种子（整数，控制噪声可复现；不传则随机）",
    )
    parser.add_argument(
        "--out",
        type=str,
        default=os.path.join("output", "wallpaper-4k.png"),
        help="输出 PNG 路径（默认 output/wallpaper-4k.png）",
    )

    args = parser.parse_args(argv)

    # Resolve size
    if args.width and not args.height:
        parser.error("--width 需要同时提供 --height")
    if args.height and not args.width:
        parser.error("--height 需要同时提供 --width")

    if args.width and args.height:
        width, height = int(args.width), int(args.height)
    else:
        width, height = PRESETS[args.preset]

    # Build gradient large enough to rotate without clipping
    diag = int(math.ceil(math.hypot(width, height)))

    grad = create_linear_gradient(diag, args.start, args.end)
    base = rotate_and_crop(grad, width, height, float(args.angle))

    # Optional slight blur first (to reduce banding while keeping grain crisp)
    if args.blur and args.blur > 0:
        base = base.filter(ImageFilter.GaussianBlur(radius=float(args.blur)))

    # Grain, then vignette to subtly emphasize center
    base = add_grain(base, float(args.grain), args.seed)
    base = apply_vignette(base, float(args.vignette))

    ensure_output_dir(args.out)

    # Save as PNG (8-bit sRGB). Optimize to keep file size reasonable.
    base.save(args.out, format="PNG", optimize=True)

    print(
        f"Saved: {args.out}  size={width}x{height}  angle={args.angle}  grain={args.grain}  vignette={args.vignette}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
