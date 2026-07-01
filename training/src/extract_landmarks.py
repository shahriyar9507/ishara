"""Ishara — Phase 1: extract MediaPipe hand landmarks from an image dataset.

Input layout (place datasets under training/data/raw/<dataset_name>/):
    data/raw/<dataset>/<label>/<image>.jpg
where <label> is the Bangla character (folder name).

Output:
    data/landmarks/<dataset>.npz  with arrays:
        X       float32 [N, 126]   normalized landmark vectors (up to 2 hands)
        y       int64   [N]        class ids
        classes object  [C]        class names (Bangla), index = class id

Landmarks are made translation/scale invariant: coordinates are centered on the
wrist and scaled by the hand's bounding-box size, so recognition is robust to where
the hand appears in the frame.

Usage:
    python -m src.extract_landmarks --dataset bdsl36
    python -m src.extract_landmarks --dataset baust_lipi --max-per-class 500
"""
from __future__ import annotations

import argparse
import sys

import cv2
import numpy as np
from tqdm import tqdm

try:
    import mediapipe as mp
except ImportError:  # pragma: no cover
    sys.exit("mediapipe not installed. Run: pip install -r requirements.txt")

from . import config
from .labels import build_label_index

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def normalize_hand(landmarks) -> np.ndarray:
    """Return a 63-vector for one hand, centered on the wrist and scaled to unit box."""
    pts = np.array([[lm.x, lm.y, lm.z] for lm in landmarks], dtype=np.float32)  # [21,3]
    pts -= pts[0]  # center on wrist (landmark 0)
    scale = np.abs(pts[:, :2]).max()  # largest x/y extent
    if scale > 1e-6:
        pts /= scale
    return pts.reshape(-1)  # [63]


def extract_from_image(img_bgr, hands) -> np.ndarray | None:
    """Run MediaPipe on one image; return a [126] vector (2 hands, zero-padded) or None."""
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    result = hands.process(img_rgb)
    if not result.multi_hand_landmarks:
        return None

    vec = np.zeros(config.FEATURE_DIM, dtype=np.float32)  # [126]
    for i, hand_lms in enumerate(result.multi_hand_landmarks[: config.NUM_HANDS]):
        vec[i * config.FEATURES_PER_HAND : (i + 1) * config.FEATURES_PER_HAND] = normalize_hand(
            hand_lms.landmark
        )
    return vec


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract MediaPipe landmarks from an image dataset.")
    ap.add_argument("--dataset", required=True, help="folder name under data/raw/")
    ap.add_argument("--max-per-class", type=int, default=0, help="cap images per class (0 = all)")
    args = ap.parse_args()

    src_dir = config.RAW_DIR / args.dataset
    if not src_dir.is_dir():
        sys.exit(f"Dataset not found: {src_dir}\nPut it at data/raw/{args.dataset}/<label>/*.jpg")

    class_dirs = sorted([d for d in src_dir.iterdir() if d.is_dir()])
    if not class_dirs:
        sys.exit(f"No class subfolders in {src_dir}")
    class_names = [d.name for d in class_dirs]
    name_to_id, _ = build_label_index(class_names)

    hands = mp.solutions.hands.Hands(
        static_image_mode=True,
        max_num_hands=config.NUM_HANDS,
        min_detection_confidence=config.MIN_DETECTION_CONFIDENCE,
    )

    X, y = [], []
    misses = 0
    for cdir in class_dirs:
        images = [p for p in sorted(cdir.iterdir()) if p.suffix.lower() in IMAGE_EXTS]
        if args.max_per_class:
            images = images[: args.max_per_class]
        for img_path in tqdm(images, desc=cdir.name, unit="img", leave=False):
            img = cv2.imread(str(img_path))
            if img is None:
                continue
            vec = extract_from_image(img, hands)
            if vec is None:
                misses += 1
                continue
            X.append(vec)
            y.append(name_to_id[cdir.name])
    hands.close()

    if not X:
        sys.exit("No landmarks extracted — check images / lighting / hand visibility.")

    X = np.stack(X).astype(np.float32)
    y = np.array(y, dtype=np.int64)
    classes = np.array(sorted(class_names), dtype=object)

    out = config.LANDMARKS_DIR / f"{args.dataset}.npz"
    np.savez_compressed(out, X=X, y=y, classes=classes)
    print(f"\nSaved {out}")
    print(f"  samples: {len(X)}   classes: {len(classes)}   feature_dim: {X.shape[1]}")
    print(f"  no-hand-detected (skipped): {misses}")


if __name__ == "__main__":
    main()
