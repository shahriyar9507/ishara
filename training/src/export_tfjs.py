"""Ishara — Phase 2: export a trained Keras model to TensorFlow.js for the browser.

Writes web/public/models/<task>/ with model.json + weight shards, plus classes.json
and meta.json so the browser engine knows the labels and preprocessing.

Usage:
    python -m src.export_tfjs --dataset baust_lipi --task letters
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys

from . import config


def main() -> None:
    ap = argparse.ArgumentParser(description="Export Keras model -> TF.js (web/public/models).")
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--task", default="letters", help="output subfolder (e.g. letters, words)")
    args = ap.parse_args()

    stem = config.MODELS_DIR / f"{args.dataset}_{args.task}"
    keras_path = stem.with_suffix(".keras")
    if not keras_path.exists():
        sys.exit(f"Missing {keras_path}. Train the model first.")

    out_dir = config.WEB_MODELS_DIR / args.task
    out_dir.mkdir(parents=True, exist_ok=True)

    import tensorflow as tf
    import tensorflowjs as tfjs

    print(f"Loading {keras_path} …")
    model = tf.keras.models.load_model(keras_path)

    print(f"Converting → {out_dir} …")
    tfjs.converters.save_keras_model(model, str(out_dir))

    # Copy labels + metadata alongside the model so the browser can load them.
    for suffix in (".classes.json", ".meta.json"):
        src = stem.with_suffix(suffix)
        if src.exists():
            shutil.copy(src, out_dir / suffix.lstrip("."))

    files = sorted(p.name for p in out_dir.iterdir())
    print(f"Done. {out_dir} contains: {files}")
    print("Commit this folder (it is small) so the app ships with the model.")


if __name__ == "__main__":
    main()
