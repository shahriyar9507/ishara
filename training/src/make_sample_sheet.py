"""Ishara — build a labelling sheet: one sample image per class folder, tiled with its
index. Use this to verify/fill the index -> Bangla-letter mapping for datasets whose
folders are numeric (e.g. BAUST Lipi uses 0..35). The recognition model is correct
regardless of the display strings; this only pins down which letter each class shows.

Usage:
    python -m src.make_sample_sheet --dataset baust_lipi --subdir "500 data"
Outputs: models/<dataset>_sample_sheet.png
"""
from __future__ import annotations

import argparse
import sys

import cv2
import numpy as np

from . import config

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--subdir", default="", help="nested folder holding the class dirs")
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--tile", type=int, default=160)
    args = ap.parse_args()

    root = config.RAW_DIR / args.dataset / args.subdir if args.subdir else config.RAW_DIR / args.dataset
    if not root.is_dir():
        sys.exit(f"Not found: {root}")

    # Sort class dirs numerically when possible.
    class_dirs = [d for d in root.iterdir() if d.is_dir()]
    class_dirs.sort(key=lambda d: (int(d.name) if d.name.isdigit() else 1e9, d.name))
    if not class_dirs:
        sys.exit(f"No class subfolders in {root}")

    tile = args.tile
    cols = args.cols
    rows = (len(class_dirs) + cols - 1) // cols
    sheet = np.full((rows * tile, cols * tile, 3), 30, np.uint8)

    for i, cdir in enumerate(class_dirs):
        img_path = next((p for p in sorted(cdir.iterdir()) if p.suffix.lower() in IMAGE_EXTS), None)
        if not img_path:
            continue
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        img = cv2.resize(img, (tile, tile))
        r, c = divmod(i, cols)
        sheet[r * tile:(r + 1) * tile, c * tile:(c + 1) * tile] = img
        # index badge
        cv2.rectangle(sheet, (c * tile, r * tile), (c * tile + 34, r * tile + 22), (0, 0, 0), -1)
        cv2.putText(sheet, cdir.name, (c * tile + 4, r * tile + 16),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)

    out = config.MODELS_DIR / f"{args.dataset}_sample_sheet.png"
    cv2.imwrite(str(out), sheet)
    print(f"Saved {out}  ({len(class_dirs)} classes)")
    print("Open it, then fill training/labels_<dataset>.json: index -> Bangla letter.")


if __name__ == "__main__":
    main()
