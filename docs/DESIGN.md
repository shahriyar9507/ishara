# Ishara — Design System & UI Theme

The UI **theme, mood, and visual language** follow the two reference mockups the user provided
(see `docs/design-references/`). **Content is Ishara-specific** (Bangla Sign Language → text & voice) —
we borrow the *look*, not the words.

Core visual language shared by both references:
**glassmorphism · a glowing energy orb · animated waveform / pulse rings · circular glass buttons ·
a central glowing mic FAB · rounded cards · mobile-first**.

Ishara ships **two themes** built from the two references:

- **Aurora (dark)** — default. Deep midnight-blue, aurora glow, electric-blue accent. *(Reference 1)*
- **Lavender (light)** — soft lavender→white, violet accent. *(Reference 2)*

---

## 1. How the references map onto Ishara

| Reference element | Ishara meaning |
|---|---|
| Glowing energy **orb** (center) | **Recognition-status orb** — idle / camera-on / recognizing / speaking |
| Animated **waveform** ("I'm Listening") | **Live recognition activity** — pulses with hand-motion / confidence |
| Concentric **pulse rings** around mic | **Active-capture** ring while camera is reading signs |
| Central **mic FAB** | **Start/Stop recognition** (camera capture toggle) |
| Rounded **caption card** ("Here is today's schedule…") | **Recognized text panel** — live letters → words → Bangla sentence |
| "**Change Language**" list screen | **Settings**: TTS voice / language & recognition options list |
| "**Select Model & Tool**" card grid | **Mode picker**: Letters · Words · Sentences (+ TTS voice choice), crown = "pro/upgrade" TTS |
| Pill badge "Aurora1.0 Beta" | **App/version badge** — e.g. `Ishara · Beta` |
| Bottom circular buttons (speaker/keyboard/close) | **Speak (TTS) · Keyboard/manual · Clear** controls |

---

## 2. Design tokens

### Aurora (dark) — default
```
--bg-base:        #0A0F1E   /* midnight base */
--bg-elev:        #0E1526   /* elevated surface */
--aurora-glow-1:  #1E3A8A33 /* faint blue aurora */
--aurora-glow-2:  #0EA5E922 /* faint teal aurora */
--glass-bg:       rgba(255,255,255,0.06)
--glass-border:   rgba(255,255,255,0.12)
--glass-blur:     20px
--accent:         #2E7DFF   /* electric blue */
--accent-2:       #1E4FFF
--accent-grad:    linear-gradient(135deg,#2E7DFF 0%,#1E4FFF 100%)
--orb-core:       #3B82F6   /* glowing sphere */
--orb-glow:       #60A5FA
--text-primary:   #F5F8FF
--text-secondary: #93A0B8
--success:        #22C55E
--warning:        #F59E0B
--radius-card:    24px
--radius-pill:    999px
```

### Lavender (light)
```
--bg-base:        #F5F3FF   /* lavender white */
--bg-grad:        linear-gradient(180deg,#EDE9FE 0%,#F7F5FF 100%)
--glass-bg:       rgba(255,255,255,0.55)
--glass-border:   rgba(255,255,255,0.7)
--glass-blur:     18px
--accent:         #7C6BF5   /* violet */
--accent-2:       #8B5CF6
--accent-grad:    linear-gradient(135deg,#8B5CF6 0%,#7C6BF5 100%)
--orb-core:       #8B5CF6
--orb-glow:       #C4B5FD
--text-primary:   #1E1B2E
--text-secondary: #6B6785
--radius-card:    24px
```

### Type & spacing (both themes)
- **Font:** Inter / SF Pro-like sans. Bangla text: **Noto Sans Bengali** (or Hind Siliguri) for correct rendering.
- Title 20–22px semibold · Body 15–16px · Caption 12–13px muted.
- Card padding 16–20px · gaps 12–16px · comfortable touch targets (≥44px).

---

## 3. Signature components (build in Phase 6)

1. **RecognitionOrb** — glowing sphere with soft outer glow; states: `idle` (slow breathe), `listening/capturing` (faster pulse), `recognizing` (energetic), `speaking` (ripple). Canvas/CSS radial-gradient + blur; respects `prefers-reduced-motion`.
2. **ActivityWave** — thin animated bars (blue/violet) reflecting live motion/confidence, like the reference waveform.
3. **PulseRings** — concentric expanding rings behind the mic FAB while capturing.
4. **GlassCard** — frosted surface: `backdrop-blur`, translucent bg, 1px light border, `radius-card`, soft shadow.
5. **MicFAB** — central circular gradient button; toggles camera recognition; glow ring when active.
6. **CaptionPanel** — glass card showing live recognized text: instant letters/words (bold) + the Gemini Bangla sentence a beat later (regular), with a Speak (TTS) button.
7. **ModeGrid** — 2-col card grid (like "Select Model & Tool"): Letters · Words · Sentences, plus TTS voice options; "upgrade" items get a crown badge.
8. **OptionList** — rounded list rows with leading icon, label, trailing radio/check; selected row = accent gradient fill + check (like "Change Language").
9. **TopBar** — circular glass back button · centered title · optional action button.
10. **ThemeToggle** — switch Aurora (dark) ↔ Lavender (light).

---

## 4. Screen mapping (Ishara)

- **Home / Recognize** — camera feed + RecognitionOrb + ActivityWave + CaptionPanel + MicFAB (mirrors the dark "I'm Listening" screen).
- **Mode & Voice** — ModeGrid (mirrors "Select Model & Tool").
- **Settings / Language & Voice** — OptionList (mirrors "Change Language").
- **Practice mode** (Phase 3 feature) — reuses the same components.

---

## 5. Principles

- **Clean layout, meaningful UI** (literally the note in Reference 1). No clutter; one clear primary action per screen.
- **Glassmorphism everywhere**, but keep contrast accessible (WCAG AA on text).
- **Motion with restraint** — orb/wave/pulse are ambient; disable under `prefers-reduced-motion`.
- **Mobile-first**, then scale up to desktop (PWA runs on PC too).
- Bangla-first copy, English secondary where helpful.
