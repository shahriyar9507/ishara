"""
Ishara — extract coordinate ANIMATIONS from the 60 word sign clips, to drive a 3D avatar.

For each word: run MediaPipe Hands + Pose on its reference clip, sample ~FRAMES frames, and
save the per-frame hand (2x21) + pose (33) landmark coordinates. This is the math the browser
avatar replays — no hand-authored animation. Output: /kaggle/working/sign_animations.json
"""
import json, os, subprocess, sys, glob
from pathlib import Path

subprocess.run([sys.executable, "-m", "pip", "install", "-q",
                "protobuf==4.25.3", "mediapipe==0.10.14"], check=False)

import cv2, numpy as np
import mediapipe as mp

FRAMES = 20          # frames kept per sign (smooth enough, small file)
MAX_CLIPS = 1        # one representative clip per word

def find_root():
    for base in glob.glob("/kaggle/input/*"):
        for dp, dirs, files in os.walk(base):
            if any(f.lower().endswith(".mp4") for f in files):
                return str(Path(dp).parent)
    raise SystemExit("no mp4s")

ROOT = find_root(); print("root:", ROOT)
word_dirs = sorted(d for d in Path(ROOT).iterdir() if d.is_dir())
print("words:", len(word_dirs))

hands = mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=2,
                                 min_detection_confidence=0.3, min_tracking_confidence=0.3)
pose = mp.solutions.pose.Pose(static_image_mode=False, model_complexity=1,
                              min_detection_confidence=0.3, min_tracking_confidence=0.3)

def r(v): return round(float(v), 4)

def frame_coords(img):
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h = hands.process(rgb)
    p = pose.process(rgb)
    hs = []
    if h.multi_hand_landmarks:
        for hand in h.multi_hand_landmarks[:2]:
            hs.append([[r(l.x), r(l.y), r(l.z)] for l in hand.landmark])
    ps = []
    if p.pose_landmarks:
        ps = [[r(l.x), r(l.y), r(l.z)] for l in p.pose_landmarks.landmark]
    return {"hands": hs, "pose": ps}

anims = {}
for wd in word_dirs:
    clips = sorted(wd.glob("*.mp4"), key=lambda p: p.stat().st_size)[:MAX_CLIPS]
    if not clips: continue
    cap = cv2.VideoCapture(str(clips[0]))
    frames = []
    while True:
        ok, fr = cap.read()
        if not ok: break
        frames.append(fr)
    cap.release()
    if not frames: continue
    idx = np.linspace(0, len(frames)-1, min(FRAMES, len(frames))).astype(int)
    anims[wd.name] = {"fps": 12, "frames": [frame_coords(frames[i]) for i in idx]}
    print("  anim:", wd.name, len(anims[wd.name]["frames"]))

hands.close(); pose.close()
Path("/kaggle/working/sign_animations.json").write_text(json.dumps(anims, separators=(",", ":")))
sz = os.path.getsize("/kaggle/working/sign_animations.json")/1024
print(f"wrote sign_animations.json ({len(anims)} words, {sz:.0f} KB)")
print("DONE")
