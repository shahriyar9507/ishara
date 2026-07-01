"""
Ishara — self-contained Kaggle training kernel.

Run this on Kaggle (Notebook) with the BAUST Lipi dataset attached and Internet ON.
It: installs mediapipe, extracts hand landmarks, trains the letter classifier (TF,
preinstalled on Kaggle), and writes the browser model to /kaggle/working/:
    model.json          <- load this at web/public/models/letters/model.json
    sample_sheet.png    <- one image per class, to verify the 0..35 -> Bangla mapping

No dependency on the repo — everything is inline so it runs standalone on Kaggle.
"""
import json, os, subprocess, sys, glob
from pathlib import Path

# ---- 1. deps (TF is preinstalled on Kaggle; mediapipe is not) ---------------
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "mediapipe==0.10.14"], check=False)

import cv2, numpy as np
import mediapipe as mp
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks

# ---- 2. config --------------------------------------------------------------
NUM_HANDS, LM_PER_HAND, COORDS = 2, 21, 3
FEATURES_PER_HAND = LM_PER_HAND * COORDS          # 63
FEATURE_DIM = NUM_HANDS * FEATURES_PER_HAND       # 126
MAX_PER_CLASS = int(os.environ.get("MAX_PER_CLASS", "300"))  # cap for speed; raise for accuracy
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Provisional index -> Bangla letter (verify with sample_sheet.png).
LABELS = {
    "0":"অ","1":"আ","2":"ই","3":"উ","4":"এ","5":"ও",
    "6":"ক","7":"খ","8":"গ","9":"ঘ","10":"ঙ","11":"চ","12":"ছ","13":"জ","14":"ঝ","15":"ঞ",
    "16":"ট","17":"ঠ","18":"ড","19":"ঢ","20":"ণ","21":"ত","22":"থ","23":"দ","24":"ধ","25":"ন",
    "26":"প","27":"ফ","28":"ব","29":"ভ","30":"ম","31":"য","32":"র","33":"ল","34":"শ","35":"স",
}

# ---- 3. locate the dataset root (folder holding numeric class dirs) ----------
def find_root():
    for base in glob.glob("/kaggle/input/*"):
        for dirpath, dirs, _ in os.walk(base):
            numeric = [d for d in dirs if d.isdigit()]
            if len(numeric) >= 30:
                return dirpath
    raise SystemExit("Could not find class folders under /kaggle/input/*")

ROOT = find_root()
print("dataset root:", ROOT)
class_dirs = sorted((d for d in Path(ROOT).iterdir() if d.is_dir() and d.name.isdigit()),
                    key=lambda d: int(d.name))
folder_names = [d.name for d in class_dirs]
classes = [LABELS.get(n, n) for n in folder_names]
print("classes:", len(classes))

# ---- 4. extract landmarks ---------------------------------------------------
hands = mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=NUM_HANDS,
                                 min_detection_confidence=0.5)

def norm_hand(lms):
    pts = np.array([[p.x, p.y, p.z] for p in lms], np.float32)
    pts -= pts[0]
    s = np.abs(pts[:, :2]).max()
    if s > 1e-6: pts /= s
    return pts.reshape(-1)

def feats(img):
    res = hands.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    if not res.multi_hand_landmarks: return None
    v = np.zeros(FEATURE_DIM, np.float32)
    for i, h in enumerate(res.multi_hand_landmarks[:NUM_HANDS]):
        v[i*FEATURES_PER_HAND:(i+1)*FEATURES_PER_HAND] = norm_hand(h.landmark)
    return v

X, y, sample_paths = [], [], []
for cid, cdir in enumerate(class_dirs):
    imgs = [p for p in sorted(cdir.iterdir()) if p.suffix.lower() in IMAGE_EXTS][:MAX_PER_CLASS]
    if imgs: sample_paths.append(imgs[0])
    got = 0
    for p in imgs:
        im = cv2.imread(str(p))
        if im is None: continue
        f = feats(im)
        if f is None: continue
        X.append(f); y.append(cid); got += 1
    print(f"  class {cdir.name} ({classes[cid]}): {got} landmarks")
hands.close()
X, y = np.stack(X).astype(np.float32), np.array(y, np.int64)
print("dataset:", X.shape, "labels:", y.shape)

# ---- 5. train ---------------------------------------------------------------
idx = np.random.RandomState(42).permutation(len(X))
X, y = X[idx], y[idx]
cut = int(len(X) * 0.85)
Xtr, Xte, ytr, yte = X[:cut], X[cut:], y[:cut], y[cut:]

model = models.Sequential([
    layers.Input((FEATURE_DIM,)),
    layers.Dense(256, activation="relu"), layers.Dropout(0.3),
    layers.Dense(128, activation="relu"), layers.Dropout(0.3),
    layers.Dense(len(classes), activation="softmax"),
], name="ishara_letters")
model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
              loss="sparse_categorical_crossentropy", metrics=["accuracy"])
model.fit(Xtr, ytr, validation_split=0.15, epochs=80, batch_size=64, verbose=2,
          callbacks=[callbacks.EarlyStopping(monitor="val_accuracy", patience=10,
                                             restore_best_weights=True)])
acc = model.evaluate(Xte, yte, verbose=0)[1]
print(f"\nTEST ACCURACY: {acc:.4f}")

# ---- 6. export browser model.json (pure Dense weights) ----------------------
dense = [l for l in model.layers if isinstance(l, tf.keras.layers.Dense)]
spec = {
    "task": "letters", "featureDim": FEATURE_DIM, "numHands": NUM_HANDS,
    "landmarksPerHand": LM_PER_HAND, "normalization": "wrist-centered, scaled by max |x,y| per hand",
    "testAccuracy": float(acc), "classes": classes,
    "layers": [{"units": int(l.get_weights()[0].shape[1]),
                "activation": l.get_config().get("activation", "linear"),
                "W": l.get_weights()[0].astype(float).tolist(),
                "b": l.get_weights()[1].astype(float).tolist()} for l in dense],
}
Path("/kaggle/working/model.json").write_text(json.dumps(spec, ensure_ascii=False))
print("wrote /kaggle/working/model.json")

# ---- 7. sample sheet for label verification ---------------------------------
cols, tile = 6, 160
rows = (len(class_dirs) + cols - 1) // cols
sheet = np.full((rows*tile, cols*tile, 3), 30, np.uint8)
for i, p in enumerate(sample_paths):
    im = cv2.imread(str(p))
    if im is None: continue
    im = cv2.resize(im, (tile, tile))
    r, c = divmod(i, cols)
    sheet[r*tile:(r+1)*tile, c*tile:(c+1)*tile] = im
    cv2.rectangle(sheet, (c*tile, r*tile), (c*tile+34, r*tile+22), (0,0,0), -1)
    cv2.putText(sheet, folder_names[i], (c*tile+4, r*tile+16),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,255), 1, cv2.LINE_AA)
cv2.imwrite("/kaggle/working/sample_sheet.png", sheet)
print("wrote /kaggle/working/sample_sheet.png")
print("DONE — download model.json + sample_sheet.png from the notebook Output.")
