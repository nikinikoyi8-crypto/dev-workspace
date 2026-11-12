"""
Extract icons from sprite sheets by detecting non-white connected components.
Saves each detected icon as a separate PNG with transparent background into
`public/assets/images/icons/` and writes a `manifest.json` listing all output files.

Usage:
    python tools/extract_icons.py public/assets/images/icon-pack-1.png public/assets/images/icon-pack-2.png

Requirements:
    - Python 3.8+
    - Pillow

Notes:
    - This script treats near-white pixels as background. It finds connected
      components of non-background pixels and outputs bounding boxes.
    - For very large sprite sheets this can be slow; it's a simple pure-Python
      implementation using Pillow. If you prefer a faster method, install
      OpenCV (`opencv-python`) and I can provide an alternative.
"""
from PIL import Image
import sys
import os
import json
from collections import deque


def ensure_icons_dir(out_dir):
    os.makedirs(out_dir, exist_ok=True)


def is_background(r, g, b, a, thresh=245):
    # consider near-white as background; also fully transparent
    if a < 10:
        return True
    return r >= thresh and g >= thresh and b >= thresh


def find_components(img):
    w, h = img.size
    pix = img.load()
    visited = [[False] * h for _ in range(w)]
    components = []

    for x in range(w):
        for y in range(h):
            if visited[x][y]:
                continue
            r, g, b, a = pix[x, y]
            if is_background(r, g, b, a):
                visited[x][y] = True
                continue
            # BFS flood fill
            q = deque()
            q.append((x, y))
            visited[x][y] = True
            minx, miny, maxx, maxy = x, y, x, y
            while q:
                cx, cy = q.popleft()
                cr, cg, cb, ca = pix[cx, cy]
                if not is_background(cr, cg, cb, ca):
                    minx = min(minx, cx)
                    miny = min(miny, cy)
                    maxx = max(maxx, cx)
                    maxy = max(maxy, cy)
                for nx, ny in ((cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                        visited[nx][ny] = True
                        nr, ng, nb, na = pix[nx, ny]
                        if not is_background(nr, ng, nb, na):
                            q.append((nx, ny))
            components.append((minx, miny, maxx+1, maxy+1))
    return components


def crop_and_save(img, bbox, out_dir, base_name, idx):
    left, top, right, bottom = bbox
    if right - left <= 2 or bottom - top <= 2:
        return None
    crop = img.crop((left, top, right, bottom))
    # create new RGBA image with transparent background
    new_img = Image.new('RGBA', crop.size, (255,255,255,0))
    # paste crop onto new image; but first make white -> transparent
    data = crop.convert('RGBA')
    pixels = data.load()
    w, h = data.size
    for x in range(w):
        for y in range(h):
            r, g, b, a = pixels[x, y]
            if is_background(r, g, b, a, thresh=245):
                pixels[x, y] = (255,255,255,0)
    new_img.paste(data, (0,0), data)
    out_path = os.path.join(out_dir, f"{base_name}_{idx:04d}.png")
    new_img.save(out_path)
    return os.path.basename(out_path)


def process_file(path, out_dir, base_name, start_idx=0):
    img = Image.open(path).convert('RGBA')
    print(f"Processing {path} ({img.size[0]}x{img.size[1]})")
    comps = find_components(img)
    print(f"Found {len(comps)} components")
    saved = []
    idx = start_idx
    for bbox in comps:
        name = crop_and_save(img, bbox, out_dir, base_name, idx)
        if name:
            saved.append(name)
            idx += 1
    return saved, idx


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python tools/extract_icons.py path/to/icon-pack-1.png path/to/icon-pack-2.png ...")
        sys.exit(1)
    out_dir = os.path.join('public', 'assets', 'images', 'icons')
    ensure_icons_dir(out_dir)
    manifest = []
    idx = 0
    for i, path in enumerate(args):
        base = f"pack{i+1}"
        saved, idx = process_file(path, out_dir, base, start_idx=idx)
        manifest.extend(saved)
    manifest_path = os.path.join(out_dir, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f"Saved {len(manifest)} icons to {out_dir}")
    print(f"Manifest written to {manifest_path}")


if __name__ == '__main__':
    main()
