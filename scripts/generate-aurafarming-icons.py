"""Generate all AuraFarming PNG and ICO icon assets from assets/prod/aurafarming-logo-source.png."""
from collections import deque
from pathlib import Path
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PNG = REPO_ROOT / "assets" / "prod" / "aurafarming-logo-source.png"


def strip_outer_white_corners(img: Image.Image) -> Image.Image:
    """If the uploaded squircle has opaque white corners outside the dark tile, flood-fill them to transparent."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()

    # Check if the 4 corners are already transparent
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    if all(pixels[x, y][3] < 10 for x, y in corners):
        return rgba

    # Flood-fill bright/white exterior pixels connected to the 4 corners
    visited = bytearray(w * h)
    queue: deque[tuple[int, int]] = deque()
    for cx, cy in corners:
        r, g, b, a = pixels[cx, cy]
        if a > 0 and r > 180 and g > 180 and b > 180:
            visited[cy * w + cx] = 1
            queue.append((cx, cy))

    while queue:
        x, y = queue.popleft()
        r, g, b, a = pixels[x, y]
        lum = (r + g + b) / 3.0
        # Smooth anti-aliased transition near the dark squircle border
        if lum >= 235:
            pixels[x, y] = (0, 0, 0, 0)
        else:
            # Darken anti-aliased edge pixel cleanly into alpha
            alpha = int(max(0, min(255, (240 - lum) / 240.0 * 255)))
            pixels[x, y] = (0, 0, 0, alpha)
            continue

        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx]:
                    nr, ng, nb, na = pixels[nx, ny]
                    if na > 0 and (nr + ng + nb) / 3.0 > 60:
                        visited[idx] = 1
                        queue.append((nx, ny))

    return rgba


def main() -> None:
    raw = Image.open(SOURCE_PNG).convert("RGBA")
    cleaned = strip_outer_white_corners(raw)
    # Trim any tiny empty margin around the squircle and center on 1024x1024 with subtle 2% breathing room
    bbox = cleaned.getbbox()
    if bbox:
        cropped = cleaned.crop(bbox)
    else:
        cropped = cleaned
    side = max(cropped.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2), cropped)
    base = canvas.resize((1024, 1024), Image.Resampling.LANCZOS)

    def save_png(rel_path: str, size: int) -> None:
        target = REPO_ROOT / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        img = base if size == 1024 else base.resize((size, size), Image.Resampling.LANCZOS)
        img.save(target, format="PNG", optimize=True)

    def save_ico(rel_path: str, sizes: list[int]) -> None:
        target = REPO_ROOT / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        base.save(target, format="ICO", sizes=[(s, s) for s in sizes])

    ico_sizes = [16, 24, 32, 48, 64, 128, 256]

    for prefix, ios, mac, uni, win_ico, web_prefix in [
        ("assets/prod", "black-ios-1024.png", "black-macos-1024.png", "black-universal-1024.png", "t3-black-windows.ico", "t3-black-web"),
        ("assets/dev", "blueprint-ios-1024.png", "blueprint-macos-1024.png", "blueprint-universal-1024.png", "blueprint-windows.ico", "blueprint-web"),
        ("assets/nightly", "nightly-ios-1024.png", "nightly-macos-1024.png", "nightly-universal-1024.png", "nightly-windows.ico", "nightly-web"),
    ]:
        save_png(f"{prefix}/{ios}", 1024)
        save_png(f"{prefix}/{mac}", 1024)
        save_png(f"{prefix}/{uni}", 1024)
        save_ico(f"{prefix}/{win_ico}", ico_sizes)
        save_png(f"{prefix}/{web_prefix}-apple-touch-180.png", 180)
        save_png(f"{prefix}/{web_prefix}-icon-192x192.png", 192)
        save_png(f"{prefix}/{web_prefix}-icon-512x512.png", 512)
        save_png(f"{prefix}/{web_prefix}-favicon-16x16.png", 16)
        save_png(f"{prefix}/{web_prefix}-favicon-32x32.png", 32)
        save_ico(f"{prefix}/{web_prefix}-favicon.ico", [16, 32, 48])

    save_ico("apps/web/public/favicon.ico", [16, 32, 48])
    save_png("apps/web/public/favicon-16x16.png", 16)
    save_png("apps/web/public/favicon-32x32.png", 32)
    save_png("apps/web/public/apple-touch-icon.png", 180)
    save_png("apps/web/public/icon-192x192.png", 192)
    save_png("apps/web/public/icon-512x512.png", 512)

    save_ico("assets/prod/aurafarming.ico", ico_sizes)
    save_png("assets/prod/aurafarming-512.png", 512)
    print("Successfully generated all AuraFarming icon assets from custom golden eye logo!")


if __name__ == "__main__":
    main()
