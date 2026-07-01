"""Ishara — Phase 2: train the static letter (finger-spelling) classifier.

Letters are static poses, so a compact Dense/MLP over the 126-dim landmark vector is
the right model (dynamic words use an LSTM later, Phase 4). The landmark features are
already wrist-centered & scale-normalized (see extract_landmarks.py), so the model is
robust to hand position/size.

Input:  data/landmarks/<dataset>_split.npz  (X_train, X_test, y_train, y_test, classes)
Output: models/<dataset>_letters.keras
        models/<dataset>_letters.classes.json   (Bangla labels, index = class id)
        models/<dataset>_letters.meta.json       (preprocessing metadata for the browser)

Usage:
    python -m src.train_letters --dataset baust_lipi --epochs 60
"""
from __future__ import annotations

import argparse
import json
import sys

import numpy as np

from . import config


def build_model(input_dim: int, num_classes: int):
    import tensorflow as tf
    from tensorflow.keras import layers, models

    model = models.Sequential(
        [
            layers.Input(shape=(input_dim,)),
            layers.Dense(256, activation="relu"),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            layers.Dense(128, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(num_classes, activation="softmax"),
        ],
        name="ishara_letters",
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main() -> None:
    ap = argparse.ArgumentParser(description="Train the static letter classifier.")
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--epochs", type=int, default=60)
    ap.add_argument("--batch-size", type=int, default=64)
    args = ap.parse_args()

    import tensorflow as tf

    split = config.LANDMARKS_DIR / f"{args.dataset}_split.npz"
    if not split.exists():
        sys.exit(f"Missing {split}. Run extract_landmarks + train_test_split first.")

    data = np.load(split, allow_pickle=True)
    X_train, X_test = data["X_train"], data["X_test"]
    y_train, y_test = data["y_train"], data["y_test"]
    classes = [str(c) for c in data["classes"]]
    num_classes = len(classes)
    print(f"train {X_train.shape}  test {X_test.shape}  classes {num_classes}")

    model = build_model(X_train.shape[1], num_classes)
    model.summary()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=10, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-5),
    ]
    model.fit(
        X_train, y_train,
        validation_split=0.15,
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=callbacks,
        verbose=2,
    )

    loss, acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"\nTEST accuracy: {acc:.4f}   loss: {loss:.4f}")

    # Per-class report
    y_pred = model.predict(X_test, verbose=0).argmax(axis=1)
    try:
        from sklearn.metrics import classification_report
        print(classification_report(y_test, y_pred, target_names=classes, zero_division=0))
    except Exception:
        pass

    stem = config.MODELS_DIR / f"{args.dataset}_letters"
    model.save(f"{stem}.keras")
    (stem.with_suffix(".classes.json")).write_text(
        json.dumps(classes, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (stem.with_suffix(".meta.json")).write_text(
        json.dumps(
            {
                "task": "letters",
                "featureDim": int(X_train.shape[1]),
                "numHands": config.NUM_HANDS,
                "landmarksPerHand": config.LANDMARKS_PER_HAND,
                "coords": config.COORDS,
                "normalization": "wrist-centered, scaled by max |x,y| per hand",
                "testAccuracy": float(acc),
                "classes": classes,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Saved {stem}.keras (+ classes/meta json)")


if __name__ == "__main__":
    main()
