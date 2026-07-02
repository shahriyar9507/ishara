# Deploying Ishara to Vercel (free)

The app is a Next.js project in the **`web/`** subfolder. It needs one environment
variable: **`GEMINI_API_KEY`**. Because we already auto-push to GitHub, the Vercel GitHub
integration will **auto-deploy on every commit**.

## One-time setup (~5 min, in the browser)

1. Go to **https://vercel.com/new** and sign in with **GitHub**.
2. **Import** the repository **`shahriyar9507/ishara`**.
3. In the import screen, set **Root Directory** → **`web`** (click "Edit" next to Root Directory and pick `web`).
   - Framework Preset should auto-detect **Next.js**. Build command `next build`, output auto.
4. Expand **Environment Variables** and add:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** *(the Gemini key)*
5. Click **Deploy**. Wait ~2 min → you get a live URL like `https://ishara-xxxx.vercel.app`.

That URL works on **PC, iOS and Android** (installable as a PWA). Every future `git push`
to `main` redeploys automatically.

## Notes
- `GEMINI_API_KEY` is only used server-side (the `/api/*` routes) — it is never exposed to the browser.
- The trained models, animations, and reference clips are committed under `web/public/`, so they ship with the deploy.
- Camera + microphone need HTTPS — Vercel provides HTTPS automatically. ✅
- On iOS, open the Vercel URL in **Safari** and "Add to Home Screen" for the app experience.

## Alternative: deploy from the CLI
If you prefer, create a Vercel token (vercel.com → Settings → Tokens) and share it, and the
deploy can be run via `vercel --prod` from the `web/` folder with `GEMINI_API_KEY` set.
