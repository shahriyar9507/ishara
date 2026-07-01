"""Ishara training — shared configuration (paths & constants)."""
import sys
from pathlib import Path

# Bangla labels are printed to the console (tqdm descriptions, summaries). The default
# Windows console codepage (cp1252) can't encode Bengali, so force UTF-8 output.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")  # Python 3.7+
    except (AttributeError, ValueError):
        pass

# ---- Paths -----------------------------------------------------------------
TRAINING_DIR = Path(__file__).resolve().parent.parent      # training/
DATA_DIR = TRAINING_DIR / "data"
RAW_DIR = DATA_DIR / "raw"                                  # downloaded datasets
LANDMARKS_DIR = DATA_DIR / "landmarks"                      # extracted vectors (.npz)
MODELS_DIR = TRAINING_DIR / "models"                        # Keras weights (gitignored)
WEB_MODELS_DIR = TRAINING_DIR.parent / "web" / "public" / "models"  # TF.js export target

# ---- Landmark feature layout ----------------------------------------------
# MediaPipe Hands: 21 landmarks x (x, y, z) = 63 features per hand.
# We support up to 2 hands (BdSL uses two-handed signs) -> 126 features.
NUM_HANDS = 2
LANDMARKS_PER_HAND = 21
COORDS = 3
FEATURES_PER_HAND = LANDMARKS_PER_HAND * COORDS            # 63
FEATURE_DIM = NUM_HANDS * FEATURES_PER_HAND                # 126

# For dynamic words (Phase 4): sequence of frames.
SEQUENCE_LENGTH = 30

# ---- MediaPipe detection thresholds ---------------------------------------
MIN_DETECTION_CONFIDENCE = 0.5
MIN_TRACKING_CONFIDENCE = 0.5

# ---- Split -----------------------------------------------------------------
TEST_SIZE = 0.2
RANDOM_SEED = 42

for _d in (RAW_DIR, LANDMARKS_DIR, MODELS_DIR):
    _d.mkdir(parents=True, exist_ok=True)
