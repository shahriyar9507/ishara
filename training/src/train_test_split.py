"""Ishara — Phase 1: split extracted landmarks into stratified train/test sets.

Input:  data/landmarks/<dataset>.npz  (X, y, classes)  from extract_landmarks.py
Output: data/landmarks/<dataset>_split.npz  (X_train, X_test, y_train, y_test, classes)

Usage:
    python -m src.train_test_split --dataset bdsl36
"""
from __future__ import annotations

import argparse
import sys

import numpy as np
from sklearn.model_selection import train_test_split

from . import config


def main() -> None:
    ap = argparse.ArgumentParser(description="Stratified train/test split of landmark vectors.")
    ap.add_argument("--dataset", required=True, help="dataset name (matches <dataset>.npz)")
    ap.add_argument("--test-size", type=float, default=config.TEST_SIZE)
    args = ap.parse_args()

    src = config.LANDMARKS_DIR / f"{args.dataset}.npz"
    if not src.exists():
        sys.exit(f"Missing {src}. Run: python -m src.extract_landmarks --dataset {args.dataset}")

    data = np.load(src, allow_pickle=True)
    X, y, classes = data["X"], data["y"], data["classes"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=args.test_size,
        random_state=config.RANDOM_SEED,
        stratify=y,
    )

    out = config.LANDMARKS_DIR / f"{args.dataset}_split.npz"
    np.savez_compressed(
        out,
        X_train=X_train, X_test=X_test,
        y_train=y_train, y_test=y_test,
        classes=classes,
    )
    print(f"Saved {out}")
    print(f"  train: {len(X_train)}   test: {len(X_test)}   classes: {len(classes)}")


if __name__ == "__main__":
    main()
