"""Ishara — export a trained Keras Dense model to a compact JSON the browser loads
directly into TF.js (no tensorflowjs converter — avoids its broken Windows deps).

Output: web/public/models/<task>/model.json  with:
  { task, featureDim, classes, layers: [ {units, activation, W:[[..]], b:[..]} ... ] }

Usage:
    python -m src.export_weights --dataset baust_lipi --task letters
"""
from __future__ import annotations

import argparse
import json
import sys

from . import config


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--task", default="letters")
    args = ap.parse_args()

    stem = config.MODELS_DIR / f"{args.dataset}_{args.task}"
    keras_path = stem.with_suffix(".keras")
    if not keras_path.exists():
        sys.exit(f"Missing {keras_path}. Train first.")

    import tensorflow as tf

    model = tf.keras.models.load_model(keras_path)
    classes = json.loads((stem.with_suffix(".classes.json")).read_text(encoding="utf-8"))

    layers_out = []
    for layer in model.layers:
        if not isinstance(layer, tf.keras.layers.Dense):
            continue  # skip Dropout etc.
        W, b = layer.get_weights()
        layers_out.append(
            {
                "units": int(W.shape[1]),
                "activation": layer.get_config().get("activation", "linear"),
                "W": W.astype(float).tolist(),  # [in, out]
                "b": b.astype(float).tolist(),  # [out]
            }
        )

    out_dir = config.WEB_MODELS_DIR / args.task
    out_dir.mkdir(parents=True, exist_ok=True)
    spec = {
        "task": args.task,
        "featureDim": int(model.inputs[0].shape[-1]),
        "numHands": config.NUM_HANDS,
        "landmarksPerHand": config.LANDMARKS_PER_HAND,
        "normalization": "wrist-centered, scaled by max |x,y| per hand",
        "classes": classes,
        "layers": layers_out,
    }
    (out_dir / "model.json").write_text(json.dumps(spec, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {out_dir / 'model.json'}  ({len(layers_out)} dense layers, {len(classes)} classes)")


if __name__ == "__main__":
    main()
