"""
Ishara — self-contained Kaggle training kernel (sklearn edition).

Runs on Kaggle with the BAUST Lipi dataset attached + Internet ON. It:
  1. installs a CONSISTENT protobuf+mediapipe+tensorflow set (Kaggle's TF needs
     protobuf>=5, but mediapipe needs <5; importing mediapipe pulls in TF, so we pin a
     matching trio to avoid the ImportError),
  2. extracts hand landmarks with mediapipe,
  3. trains a Dense classifier with scikit-learn's MLPClassifier (no TF training — avoids
     all protobuf/TF friction; identical model shape),
  4. exports web/public/models/letters/model.json (relu,relu,softmax dense layers) +
     sample_sheet.png (to verify the 0..35 -> Bangla mapping).

Outputs land in /kaggle/working/ — download them from the notebook Output.
"""
import json, os, subprocess, sys, glob
from pathlib import Path

# ---- 1. consistent deps (protobuf<5 for mediapipe; matching TF so mediapipe imports) ----
subprocess.run([sys.executable, "-m", "pip", "install", "-q",
                "protobuf==4.25.3", "mediapipe==0.10.14", "tensorflow-cpu==2.16.1"], check=False)

import cv2, numpy as np
import mediapipe as mp
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

NUM_HANDS, LM_PER_HAND, COORDS = 2, 21, 3
FEATURES_PER_HAND = LM_PER_HAND * COORDS          # 63
FEATURE_DIM = NUM_HANDS * FEATURES_PER_HAND       # 126
MAX_PER_CLASS = int(os.environ.get("MAX_PER_CLASS", "300"))
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Provisional index -> Bangla letter (verify with sample_sheet.png).
LABELS = {
    "0":"অ","1":"আ","2":"ই","3":"উ","4":"এ","5":"ও",
    "6":"ক","7":"খ","8":"গ","9":"ঘ","10":"ঙ","11":"চ","12":"ছ","13":"জ","14":"ঝ","15":"ঞ",
    "16":"ট","17":"ঠ","18":"ড","19":"ঢ","20":"ণ","21":"ত","22":"থ","23":"দ","24":"ধ","25":"ন",
    "26":"প","27":"ফ","28":"ব","29":"ভ","30":"ম","31":"য","32":"র","33":"ল","34":"শ","35":"স",
}

# ---- 2. locate dataset root (folder holding >=30 numeric class dirs) --------------------
def find_root():
    for base in glob.glob("/kaggle/input/*"):
        for dirpath, dirs, _ in os.walk(base):
            if len([d for d in dirs if d.isdigit()]) >= 30:
                return dirpath
    raise SystemExit("Could not find class folders under /kaggle/input/*")

ROOT = find_root(); print("dataset root:", ROOT)
class_dirs = sorted((d for d in Path(ROOT).iterdir() if d.is_dir() and d.name.isdigit()),
                    key=lambda d: int(d.name))
folder_names = [d.name for d in class_dirs]
classes = [LABELS.get(n, n) for n in folder_names]
print("classes:", len(classes))

# ---- 3. extract landmarks --------------------------------------------------------------
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
    print(f"  class {cdir.name} ({classes[cid]}): {got}")
hands.close()
X, y = np.stack(X).astype(np.float32), np.array(y, np.int64)
print("dataset:", X.shape)

# ---- 4. train (sklearn MLP: 126 -> 256 relu -> 128 relu -> softmax) --------------------
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)
clf = MLPClassifier(hidden_layer_sizes=(256, 128), activation="relu", solver="adam",
                    alpha=1e-4, batch_size=64, max_iter=300, early_stopping=True,
                    validation_fraction=0.15, n_iter_no_change=15, random_state=42, verbose=False)
clf.fit(Xtr, ytr)
acc = accuracy_score(yte, clf.predict(Xte))
print(f"\nTEST ACCURACY: {acc:.4f}")
print(classification_report(yte, clf.predict(Xte), target_names=classes, zero_division=0))

# ---- 5. export model.json (coefs_/intercepts_ -> dense layers) -------------------------
acts = ["relu"] * (len(clf.coefs_) - 1) + ["softmax"]
layers_out = [{"units": int(W.shape[1]), "activation": a,
               "W": W.astype(float).tolist(), "b": b.astype(float).tolist()}
              for W, b, a in zip(clf.coefs_, clf.intercepts_, acts)]
spec = {"task": "letters", "featureDim": FEATURE_DIM, "numHands": NUM_HANDS,
        "landmarksPerHand": LM_PER_HAND,
        "normalization": "wrist-centered, scaled by max |x,y| per hand",
        "testAccuracy": float(acc), "classes": classes, "layers": layers_out}
Path("/kaggle/working/model.json").write_text(json.dumps(spec, ensure_ascii=False))
print("wrote /kaggle/working/model.json")

# ---- 6. sample sheet for label verification --------------------------------------------
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
print("DONE")
