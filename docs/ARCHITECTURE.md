# Ishara — Architecture

## Scope: three layers, built one on top of the other

| Layer | What | Type |
|---|---|---|
| **1. Letters** | Finger-spelling (36 Bangla letters/digits) | Static gesture |
| **2. Words** | Everyday words | Dynamic gesture / sequence |
| **3. Sentences + voice** | Words joined into fluent Bangla, spoken | Language + TTS |

## The decision: real-time + good speed, minimal hassle

- **Recognition (vision + model):** on-device in the browser — MediaPipe JS + TF.js. No network hop → fastest (~50 ms).
- **Language (words → sentence):** Gemini API, only to make sentences fluent, **async** so it never blocks real-time.
- **Delivery:** one web engine for PC/iOS/Android. No separate plugin/server.

**Why not a backend server?** Sending every frame to a server adds network delay; on-device is faster. Keeping a server running/scaled is extra hassle for a 2-person team.

**Why not a native Flutter plugin?** MediaPipe's Flutter support is fragmented across Android/iOS/web packages. A web engine, written once, runs everywhere — half the work.

## Data flow

1. **Camera** — webcam/phone frames
2. **MediaPipe** — extract hand (and optionally face/pose via Holistic) landmarks — small vector, not raw pixels
3. **Normalize** + buffer 30 frames
4. **TF.js LSTM** — recognize letter/word on-device (~50 ms)
5. **Screen** — show recognized letter/word instantly
6. **Gemini** (async) — turn recognized words into a proper Bangla sentence
7. **TTS** — Web Speech / Cloud → voice

Instant path (camera → recognition → screen) is fully on-device and works offline. The polish (Gemini) + voice arrive a beat later, like a live interpreter.

## Cross-platform delivery

Build the hard part (web engine: MediaPipe JS + TF.js + Gemini + TTS) **once**, then ship three ways:

- **PC browser** — Chrome/Edge/Safari
- **PWA (iOS + Android)** — installs like an app, opens offline
- **Flutter shell (optional)** — WebView wrapper for App Store / Play

> **iOS caveat:** in-app WebView camera is flaky on iOS. Run the PWA in **Safari** on iOS (camera works there); add the Flutter shell later.

## Tech stack

| Part | Tool | Cost |
|---|---|---|
| Vision (on-device) | MediaPipe Tasks (JS/WASM) + TensorFlow.js | Free |
| Language layer | Gemini API — Flash-Lite, free tier | Free (~1500/day) |
| Voice (TTS) | Web Speech API → Cloud/Gemini TTS (upgrade) | Free |
| App / UI | Next.js + TS + Tailwind + PWA + Flutter shell | Free |
| Model training | Python + Kaggle/Colab free GPU → TF.js export | Free |
| Hosting / code | Vercel · Git + GitHub | Free |

**Total (demo): ~$0.** Scaling later: Gemini paid (cheap Flash-Lite), Cloud TTS, better hosting — roughly $5–20/month.

## Model & data

No ready-made BdSL model exists, so we train a light one. MediaPipe gives a small hand-landmark vector per frame (not raw pixels); a small LSTM trains on top in a few hours on free Kaggle/Colab GPU.

**Datasets (labels already in Bangla, so Bangla conversion is built in):**

- **Ishara-Lipi** — first open BdSL character set (ICBSLP 2018)
- **BAUST Lipi** — 36 letters, ~18,000 images (arXiv:2408.10518)
- **BdSL36** — 36 Bangla letters/digits (arXiv:2110.00869)
- **BdSL Words** — 10 everyday words

For Layer 2–3, the team records 20–30 common words (water, food, help, thanks…) in varied light/background to boost accuracy.

## Language layer (Gemini) & voice (TTS)

Gemini joins recognized words into natural Bangla:
`[আমি, স্কুল, যাওয়া]` → `"আমি স্কুলে যাচ্ছি"`
Prompt: *"এই শব্দগুলো দিয়ে একটি শুদ্ধ বাংলা বাক্য বানাও।"* — runs async, free tier is enough.

**TTS, two tiers:**
- **Default:** Web Speech API — in-browser, free, instant (Bangla voice available on Android)
- **Upgrade:** Google Cloud TTS Bangla / Gemini TTS / AI4Bharat Indic-TTS where no voice exists or better quality is wanted.

## Challenges & solutions

| Challenge | Solution |
|---|---|
| Light/background affects accuracy | Varied data + augmentation |
| Two hands + facial expression (BdSL grammar) | Use MediaPipe **Holistic**, not just hands |
| Same word caught repeatedly | debounce / hold-to-confirm |
| iOS WebView camera | Run as Safari PWA on iOS |
| No Bangla voice on some devices | Cloud/Gemini TTS fallback |
| Model heavy in browser | Small LSTM, quantize, GPU delegate |

## Camera & testing

Laptop camera is fine for dev/testing; the app runs on phones too. The real accuracy keys — **good light, hand+face+body in frame, 720p+, steady position** — matter more than camera brand.

## References

BAUST Lipi (arXiv:2408.10518) · BdSL36 (arXiv:2110.00869) · Ishara-Lipi (ICBSLP 2018) · MediaPipe Holistic + LSTM real-time SLR (~92–97%, ~50 ms/frame; IJRASET 2025) · MediaPipe web/JS & Flutter support (pub.dev, MediaPipe docs) · Gemini API free tier — Flash/Flash-Lite, ~1500 RPD (ai.google.dev, 2026) · Bangla TTS: Web Speech API, AI4Bharat Indic-TTS, bangla-tts.
