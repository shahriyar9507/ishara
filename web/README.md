# Ishara — Web (App)

Next.js 16 + TypeScript + Tailwind v4 **PWA** hosting the on-device real-time engine
(MediaPipe JS + TF.js), the Gemini sentence layer, and TTS voice output.

## Run

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

Copy `../.env.example` → `web/.env.local` and set `GEMINI_API_KEY` (used in Phase 4).

## Themes

Two themes from the design references (`docs/DESIGN.md`): **Lavender (light)** and
**Aurora (dark)**. On first load the theme **follows the system**; the toggle cycles
system → light → dark and persists to `localStorage`.

## Structure

```
src/
├── app/
│   ├── layout.tsx        # fonts (Inter + Noto Sans Bengali), theme init, metadata
│   ├── globals.css       # design tokens + glass/orb/wave/pulse primitives
│   └── page.tsx          # Recognize screen
├── components/           # GlassCard, RecognitionOrb, ActivityWave, MicFAB, CaptionPanel, TopBar, ThemeToggle...
└── lib/
    ├── recognizer/       # Recognizer interface + MockRecognizer (real TF.js engine swaps in)
    ├── tts.ts            # Web Speech TTS (Bangla)
    └── useTheme.ts       # theme hook
```

## Recognition engine

The UI depends only on the `Recognizer` interface (`src/lib/recognizer/types.ts`).
Today a **MockRecognizer** emits sample Bangla predictions so the whole app is runnable.
Once Phase 2 training produces a TF.js model (into `public/models/`), a real
MediaPipe + TF.js recognizer implements the same interface — no UI changes.
