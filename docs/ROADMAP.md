# Ishara — Step-by-step Roadmap

Build in order — each phase stands on the previous. Start with letters (Phase 0 → 1 → 2).

| Phase | Title | What | Milestone |
|---|---|---|---|
| **0** | Setup | Git repo, README, folders, 2-person split, Gemini key | Repo ready |
| **1** | Data & landmark | BdSL datasets → MediaPipe landmark extraction → train/test split | Model-ready data |
| **2** | Model training (letters) | LSTM train (free GPU) → evaluate → export to TF.js | Letter model |
| **3** | Web real-time engine | MediaPipe JS + TF.js in browser → live camera → instant letters + smoothing | Live recognition in browser |
| **4** | Words & sentences | Dynamic word model → collect words → Gemini Bangla sentence | Words + sentences |
| **5** | Voice (TTS) | Web Speech → async playback → Cloud TTS upgrade | Sign → voice |
| **6** | UI + PWA | Camera feed, live captions, settings, responsive, PWA install | App on all platforms |
| **7** | Polish, test & deploy | Latency tune, error handling, demo video, Vercel deploy (+ Flutter shell) | Competition-ready, live link |

## Feature roadmap (three layers)

### Layer 1 — Foundation first
- Real-time letter recognition (finger-spelling)
- Live camera + hand-landmark overlay
- Recognized letter on screen instantly
- Web Speech pronunciation of letters/words
- Confidence score

### Layer 2 — Words next
- Dynamic word recognition (sequence)
- Word accumulation + hold-to-confirm
- Add self-recorded words
- Numbers & quick phrases
- Save/export transcript

### Layer 3 — Sentences + Wow finish
- Natural Bangla sentence via Gemini
- Speak full sentence (good TTS)
- Voice/speed selection, dark mode
- Practice mode (teaches BdSL)
- PWA install + offline mode

## Commit plan (~80–100 atomic commits)

| # | Phase | ~Commits | Sample commits |
|---|---|---|---|
| 0 | Setup | 7 | `chore: init repo + gitignore`, `docs: add README` |
| 1 | Data & landmark | 11 | `feat: mediapipe landmark extraction`, `feat: train/test split` |
| 2 | Model training (letters) | 13 | `feat: LSTM training`, `feat: export to tfjs` |
| 3 | Web real-time engine | 15 | `feat: mediapipe js in browser`, `feat: live prediction`, `fix: smoothing` |
| 4 | Words & sentences | 14 | `feat: dynamic word model`, `feat: gemini sentence builder` |
| 5 | Voice (TTS) | 8 | `feat: web speech tts`, `feat: cloud tts fallback` |
| 6 | UI + PWA | 14 | `feat: caption panel`, `feat: pwa manifest`, `style: responsive` |
| 7 | Polish, test & deploy | 10 | `perf: reduce latency`, `docs: demo`, `chore: deploy vercel` |
| | **Total** | **~90** | range 80–100 |

## Commit discipline

- **Small, atomic commits** — one logical change each.
- **Conventional Commits** — `feat:` `fix:` `docs:` `refactor:` `test:` `chore:`.
- **Commit at feature end**, not batched at the very end.
- **Feature branch + PR** — `main` always working.
- **.gitignore** clean — no `node_modules`, model weights, venv; big files via LFS/releases.
- **Milestone tags** — `v0.1-letters` · `v0.2-words` · `v1.0-demo`.
