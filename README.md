# Ishara — বাংলা ইশারা ভাষা → টেক্সট ও কণ্ঠ

**Ishara** (ইশারা = "sign/gesture") turns **Bangla Sign Language (BdSL)** into **text and voice, in real time**.

It recognizes **letters** (finger-spelling), **words** (dynamic gestures), and builds natural **Bangla sentences** — then speaks them aloud. Recognition runs **on-device in the browser** (MediaPipe + TensorFlow.js), so it is fast (~50 ms) and free; a language layer (Gemini) polishes words into fluent sentences asynchronously.

One web engine → runs everywhere: **PC browser · PWA (iOS + Android) · optional Flutter shell**.

---

## Why this architecture

| Concern | Decision | Why |
|---|---|---|
| **Recognition** | On-device (MediaPipe JS + TF.js) | No network hop → fastest (~50 ms) real-time |
| **Language** (words → sentence) | Gemini API (async) | Polishes text without blocking real-time feel |
| **Delivery** | One web engine (PWA) | Write once, runs on PC/iOS/Android — half the work |
| **Cost** | Free tiers only | On-device vision + Gemini free tier + Web Speech + Vercel = ~$0 |

## Data flow

```
Camera ─▶ MediaPipe (hand/holistic landmarks) ─▶ Normalize + 30-frame buffer ─▶ TF.js LSTM
                                                                                   │
                                                    on-device, ~50 ms, free  ◀─────┘
                                                                                   │
   recognized letters/words shown INSTANTLY on screen  ◀────────────────────────── ┘
                                                                                   │
                    Gemini (words → fluent Bangla sentence, async) ─▶ TTS (Web Speech / Cloud) ─▶ 🔊 voice
```

Letters/words appear instantly (on-device). The polished sentence + voice arrive one beat later — like a live interpreter. Offline, at least letter/word recognition and Web Speech voice still work.

## Tech stack

- **Vision (on-device):** MediaPipe Tasks (JS/WASM) + TensorFlow.js
- **Language layer:** Gemini API — Flash-Lite (free tier)
- **Voice (TTS):** Web Speech API (free) → Cloud/Gemini TTS (upgrade)
- **App / UI:** Next.js + TypeScript + Tailwind + PWA (+ optional Flutter shell)
- **Model training:** Python + Kaggle/Colab free GPU → export to TF.js
- **Hosting / code:** Vercel (free) · Git + GitHub

## Repository layout

```
ishara/
├── docs/            # Blueprint, architecture, roadmap, team split
├── training/        # Python: landmark extraction + LSTM training (Phase 1–2)
├── web/             # Next.js PWA: real-time engine + UI (Phase 3+)
└── README.md
```

## Roadmap (build order)

Built in three layers — each stands on the previous. See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full step-by-step plan.

- **Phase 0** — Setup (repo, structure, tooling)
- **Phase 1** — Data & landmark extraction
- **Phase 2** — Letter model training → TF.js export
- **Phase 3** — Browser real-time engine (live letters)
- **Phase 4** — Words + Gemini sentence builder
- **Phase 5** — Voice (TTS)
- **Phase 6** — UI + PWA
- **Phase 7** — Polish, test & deploy

## Datasets (labels already in Bangla)

Ishara-Lipi · BAUST Lipi (36 letters, ~18k images) · BdSL36 · BdSL Words. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Status

🚧 Early development — Phase 0. Every logical step is committed with Conventional Commits and pushed automatically.

## Team

Two developers — Vision/ML Lead and App Lead. See **[docs/TEAM.md](docs/TEAM.md)**.

## License

MIT — see [LICENSE](LICENSE).
