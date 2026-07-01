# Ishara — Web (App)

The Next.js + TypeScript + Tailwind **PWA** that hosts the on-device real-time engine (MediaPipe JS + TF.js), the Gemini sentence layer, and TTS voice output.

Scaffolded in **Phase 3**. Until then this is a placeholder.

## Planned layout (Phase 3+)

```
web/
├── public/
│   └── models/         # TF.js model exported from ../training (committed, small)
├── src/
│   ├── app/            # Next.js app router
│   ├── lib/
│   │   ├── vision/     # MediaPipe landmark capture + normalization
│   │   ├── model/      # TF.js inference + smoothing
│   │   ├── language/   # Gemini sentence builder (server route)
│   │   └── tts/        # Web Speech + Cloud TTS fallback
│   └── components/     # camera feed, caption panel, settings
└── package.json
```

## Run (once scaffolded)

```bash
cd web
npm install
npm run dev
```

Copy `../.env.example` → `web/.env.local` and set `GEMINI_API_KEY`.
