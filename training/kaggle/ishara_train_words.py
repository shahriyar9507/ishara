"""
Ishara — Layer 2 (words) training kernel for Kaggle.

Dataset: hasaniut/bdslw60videoclips — 60 Bangla word signs as .mp4 clips, folder-per-word.
Pipeline: sample SEQ_LEN frames/clip -> MediaPipe 126-dim landmarks/frame -> [SEQ_LEN,126]
sequence -> Keras LSTM. Exports word_model.json (LSTM + dense weights) for TF.js in the browser.

Outputs to /kaggle/working/: word_model.json, word_labels.json
"""
import json, os, subprocess, sys, glob
from pathlib import Path

subprocess.run([sys.executable, "-m", "pip", "install", "-q",
                "protobuf==4.25.3", "mediapipe==0.10.14", "tensorflow-cpu==2.16.1"], check=False)

import cv2, numpy as np
import mediapipe as mp
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from sklearn.model_selection import train_test_split

NUM_HANDS, LM_PER_HAND = 2, 21
FPH = LM_PER_HAND * 3                 # 63
FEATURE_DIM = NUM_HANDS * FPH         # 126
SEQ_LEN = 30
MAX_CLIPS_PER_WORD = int(os.environ.get("MAX_CLIPS", "40"))

# locate dataset root (folder holding the word subfolders of .mp4s)
def find_root():
    for base in glob.glob("/kaggle/input/*"):
        for dp, dirs, files in os.walk(base):
            if any(f.lower().endswith(".mp4") for f in files):
                return str(Path(dp).parent)  # parent holds all word folders
    raise SystemExit("no mp4s found under /kaggle/input")

ROOT = find_root(); print("root:", ROOT)
word_dirs = sorted(d for d in Path(ROOT).iterdir() if d.is_dir())
classes = [d.name for d in word_dirs]
print("words:", len(classes), classes)

hands = mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=NUM_HANDS,
                                 min_detection_confidence=0.3, min_tracking_confidence=0.3)

def norm_hand(lms):
    pts = np.array([[p.x, p.y, p.z] for p in lms], np.float32)
    pts -= pts[0]
    s = np.abs(pts[:, :2]).max()
    if s > 1e-6: pts /= s
    return pts.reshape(-1)

def frame_feats(img):
    res = hands.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    v = np.zeros(FEATURE_DIM, np.float32)
    if res.multi_hand_landmarks:
        for i, h in enumerate(res.multi_hand_landmarks[:NUM_HANDS]):
            v[i*FPH:(i+1)*FPH] = norm_hand(h.landmark)
    return v

def clip_sequence(path):
    cap = cv2.VideoCapture(path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    if total <= 0:
        frames = []
        while True:
            ok, fr = cap.read()
            if not ok: break
            frames.append(fr)
        cap.release()
        if not frames: return None
        idx = np.linspace(0, len(frames)-1, SEQ_LEN).astype(int)
        seq = [frame_feats(frames[i]) for i in idx]
    else:
        idx = set(np.linspace(0, total-1, SEQ_LEN).astype(int).tolist())
        seq, i = [], 0
        grabbed = {}
        while True:
            ok, fr = cap.read()
            if not ok: break
            if i in idx: grabbed[i] = fr
            i += 1
        cap.release()
        order = sorted(grabbed)
        if not order: return None
        seq = [frame_feats(grabbed[k]) for k in order]
        while len(seq) < SEQ_LEN: seq.append(seq[-1])
        seq = seq[:SEQ_LEN]
    return np.array(seq, np.float32)

X, y = [], []
for cid, wd in enumerate(word_dirs):
    clips = sorted(str(p) for p in wd.glob("*.mp4"))[:MAX_CLIPS_PER_WORD]
    got = 0
    for c in clips:
        s = clip_sequence(c)
        if s is not None and s.shape == (SEQ_LEN, FEATURE_DIM):
            X.append(s); y.append(cid); got += 1
    print(f"  {wd.name}: {got} sequences")
hands.close()
X, y = np.stack(X).astype(np.float32), np.array(y, np.int64)
print("dataset:", X.shape)

Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)
model = models.Sequential([
    layers.Input((SEQ_LEN, FEATURE_DIM)),
    layers.Masking(mask_value=0.0),
    layers.LSTM(128),
    layers.Dropout(0.4),
    layers.Dense(64, activation="relu"),
    layers.Dropout(0.3),
    layers.Dense(len(classes), activation="softmax"),
], name="ishara_words")
model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
              loss="sparse_categorical_crossentropy", metrics=["accuracy"])
model.fit(Xtr, ytr, validation_split=0.15, epochs=120, batch_size=32, verbose=2,
          callbacks=[callbacks.EarlyStopping(monitor="val_accuracy", patience=15, restore_best_weights=True)])
acc = model.evaluate(Xte, yte, verbose=0)[1]
print(f"\nTEST ACCURACY: {acc:.4f}")

# export LSTM + dense weights for TF.js (rebuild with tf.layers, setWeights)
lstm = [l for l in model.layers if isinstance(l, tf.keras.layers.LSTM)][0]
k, rk, b = lstm.get_weights()
dense = [l for l in model.layers if isinstance(l, tf.keras.layers.Dense)]
acts = ["relu"]*(len(dense)-1) + ["softmax"]
spec = {
    "task": "words", "seqLen": SEQ_LEN, "featureDim": FEATURE_DIM,
    "numHands": NUM_HANDS, "landmarksPerHand": LM_PER_HAND,
    "normalization": "wrist-centered, scaled by max |x,y| per hand",
    "testAccuracy": float(acc), "classes": classes,
    "lstm": {"units": int(lstm.units),
             "kernel": k.astype(float).tolist(),
             "recurrentKernel": rk.astype(float).tolist(),
             "bias": b.astype(float).tolist()},
    "dense": [{"units": int(l.get_weights()[0].shape[1]), "activation": a,
               "W": l.get_weights()[0].astype(float).tolist(),
               "b": l.get_weights()[1].astype(float).tolist()} for l, a in zip(dense, acts)],
}
Path("/kaggle/working/word_model.json").write_text(json.dumps(spec, ensure_ascii=False))
Path("/kaggle/working/word_labels.json").write_text(json.dumps(classes, ensure_ascii=False, indent=2))
print("wrote word_model.json + word_labels.json  (classes:", len(classes), ")")
print("DONE")
