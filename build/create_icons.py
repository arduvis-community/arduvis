"""
build/create_icons.py
Generate AVC app icons for Windows (.ico) and macOS (.icns).
Requires: pip install Pillow
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import struct, io, os, sys

ICONS_DIR = Path(__file__).parent / "icons"
ICONS_DIR.mkdir(exist_ok=True)


# ── Design constants ──────────────────────────────────────────────────────────
BG_COLOR   = (17, 24, 39, 255)      # gray-900
RING_COLOR = (59, 130, 246, 255)    # blue-500
DOT_COLOR  = (34, 211, 238, 255)    # cyan-400  (motor dots)
BODY_COLOR = (99, 162, 255, 255)    # lighter blue (center body)


def draw_icon(size: int) -> Image.Image:
    """
    Draw the AVC icon at `size` × `size` pixels (RGBA).

    Design: dark rounded-square bg → quad X frame (4 arms) → motor circles at tips
            → small central body hexagon → 'AVC' text at small sizes replaced by
            a stylised top-down quad silhouette.
    """
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s = size
    pad = s * 0.08
    r   = s * 0.18   # corner radius for background

    # ── Rounded square background ────────────────────────────────────────────
    draw.rounded_rectangle([pad, pad, s - pad, s - pad],
                           radius=r, fill=BG_COLOR)

    cx, cy = s / 2, s / 2

    # ── Quad X arms ─────────────────────────────────────────────────────────
    arm_len  = s * 0.28          # centre → motor hub distance
    arm_w    = max(2, s * 0.055) # arm width
    motor_r  = max(3, s * 0.10)  # motor circle radius
    body_r   = max(2, s * 0.075) # centre body radius

    angles_deg = [45, 135, 225, 315]   # quad-X layout
    import math
    motor_centres = []
    for a in angles_deg:
        rad = math.radians(a)
        mx = cx + arm_len * math.cos(rad)
        my = cy + arm_len * math.sin(rad)
        motor_centres.append((mx, my))

    # Draw arms first (under motors)
    for mx, my in motor_centres:
        # Thick line from centre to motor
        draw.line([(cx, cy), (mx, my)], fill=RING_COLOR, width=int(arm_w))

    # Centre body
    draw.ellipse([cx - body_r, cy - body_r, cx + body_r, cy + body_r],
                 fill=BODY_COLOR)

    # Motor circles — ring + fill
    for mx, my in motor_centres:
        # Outer ring
        draw.ellipse([mx - motor_r, my - motor_r,
                      mx + motor_r, my + motor_r],
                     fill=DOT_COLOR)
        # Inner dark hole (spinning prop effect)
        inner = motor_r * 0.45
        draw.ellipse([mx - inner, my - inner,
                      mx + inner, my + inner],
                     fill=BG_COLOR)

    # ── 'A' letter in centre (only legible at >= 48px) ───────────────────────
    if size >= 48:
        font_size = max(8, int(s * 0.20))
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()
        text  = "A"
        bbox  = draw.textbbox((0, 0), text, font=font)
        tw    = bbox[2] - bbox[0]
        th    = bbox[3] - bbox[1]
        draw.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1]),
                  text, font=font, fill=(255, 255, 255, 230))

    return img


# ── Windows .ico ─────────────────────────────────────────────────────────────
def make_ico():
    """
    Hand-assemble a multi-resolution .ico file.
    Each frame is stored as a PNG stream (supported by Windows Vista+).
    ICO format: 6-byte header + N*16-byte directory + N*PNG-data blobs.
    """
    sizes = [16, 24, 32, 48, 64, 128, 256]

    # Render each size to a PNG byte string
    png_blobs = []
    for s in sizes:
        img = draw_icon(s).convert("RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        png_blobs.append(buf.getvalue())

    count = len(sizes)
    header = struct.pack('<HHH', 0, 1, count)   # reserved, type=1 (ICO), count

    # Directory: each entry is 16 bytes
    # width, height, color_count, reserved, planes, bit_count, size, offset
    dir_size   = count * 16
    data_offset = 6 + dir_size

    directory = b''
    offset    = data_offset
    for i, (s, blob) in enumerate(zip(sizes, png_blobs)):
        w = h = s if s < 256 else 0   # 256 is encoded as 0 in ICO
        directory += struct.pack('<BBBBHHII',
                                 w, h,
                                 0,      # color count (0 = no palette)
                                 0,      # reserved
                                 1,      # planes
                                 32,     # bit count
                                 len(blob),
                                 offset)
        offset += len(blob)

    path = ICONS_DIR / "avc.ico"
    path.write_bytes(header + directory + b''.join(png_blobs))
    total_kb = path.stat().st_size // 1024
    print(f"  OK  {path}  ({', '.join(str(s) for s in sizes)}px, {total_kb} KB)")


# ── macOS .icns ───────────────────────────────────────────────────────────────
# Pillow cannot write .icns directly; we build the binary format manually.
# Format: 'icns' header + concatenated icon type entries.
ICNS_TYPES = {
    16:   b'icp4',
    32:   b'icp5',
    64:   b'icp6',
    128:  b'ic07',
    256:  b'ic08',
    512:  b'ic09',
    1024: b'ic10',
}

def _icns_entry(ostype: bytes, png_bytes: bytes) -> bytes:
    length = 8 + len(png_bytes)
    return ostype + struct.pack('>I', length) + png_bytes

def make_icns():
    body = b''
    for size, ostype in ICNS_TYPES.items():
        img = draw_icon(size)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        body += _icns_entry(ostype, buf.getvalue())

    total = 8 + len(body)
    data  = b'icns' + struct.pack('>I', total) + body

    path = ICONS_DIR / "avc.icns"
    path.write_bytes(data)
    print(f"  OK  {path}  ({', '.join(str(s) for s in ICNS_TYPES)}px)")


# ── PNG previews (bonus — useful for Linux / web) ────────────────────────────
def make_pngs():
    for size in [32, 64, 128, 256, 512]:
        img  = draw_icon(size)
        path = ICONS_DIR / f"avc_{size}.png"
        img.save(path, format='PNG')
    print(f"  OK  PNG previews in {ICONS_DIR}")


if __name__ == "__main__":
    print("Generating AVC icons …")
    make_ico()
    make_icns()
    make_pngs()
    print("Done.")
