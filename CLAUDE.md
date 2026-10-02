# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working style

This is a personal learning project, built iteratively. Work in small steps: one feature or piece at a time, explain the reasoning behind non-obvious choices, (keep in mind that I am a computer science student and not a fully fledged SWE), and check in before moving on to the next feature. Don't scaffold ahead (no empty folders, stub modules, or unused dependencies for future features).

Use a feature branch per feature and merge into `main`; don't commit directly to `main`.

After implementing a feature: add tests for its behaviour where they add value (skip trivial static markup), run the full test suites plus build/lint, and report results. Then give clear manual test steps — exact URLs, what to click, and what should happen, including error cases.

## Commands

Windows machine; the backend venv is a Windows venv (`.venv/Scripts/`, no `bin/`).

Backend — run everything from `backend/` (`pytest.ini` sets `pythonpath = .`, and `config.py` loads `.env` relative to the working directory):
- Dev server: `.venv/Scripts/uvicorn app.main:app --reload` (port 8000)
- Tests: `.venv/Scripts/pytest`; single test: `.venv/Scripts/pytest tests/test_health.py::test_health`
- Lint/format: `.venv/Scripts/ruff check --fix .` and `.venv/Scripts/ruff format .` (config in `ruff.toml`)
- Add deps to `requirements.txt` and install with `.venv/Scripts/pip install -r requirements.txt`

Frontend — run from `frontend/`:
- `npm run dev` (port 5173), `npm run lint` (oxlint, not ESLint)
- `npm run build` runs `tsc -b` and is the only type-check; run it to verify TS changes.
- Tests: `npm test` (Vitest + Testing Library, jsdom); single file: `npx vitest run src/App.test.tsx`. Tests sit next to the code as `*.test.tsx`. jsdom has no `MediaRecorder`/`getUserMedia`/`URL.createObjectURL` — use the shared fakes in `src/test/fakeMedia.ts` (`stubMedia()`).

Python 3.14 is just what's installed, not a requirement — dropping to an older version is fine if a dependency lacks 3.14 support.

## Architecture

- Frontend calls relative `/api/...` paths; Vite proxies `/api` to the backend at `127.0.0.1:8000`. Backend routes include the `/api` prefix.
- New settings/API keys go in `backend/app/config.py` (pydantic-settings) and `backend/.env.example`. Provider credentials stay on the backend only.
- Styling ("cue cards"): use the tokens in `frontend/src/index.css`; Tailwind's default palette is switched off. Light mode only for now.
  - Colours: `desk` page, `card` cards, `ink`/`ink-muted` text, `cue-red` for the card rule, recording, primary buttons (`card` text on it) and error emphasis (Stop is an `ink` fill), `mark-blue` for links, Pause marks and focus, `highlighter` behind Fillers (`ink` text), `line` for borders. `rule-blue` is decoration only, never text. Red never means "bad"; Metrics and Coaching never use colour to judge.
  - Type: `font-spoken` (Literata) for words someone speaks (Topic, transcript, quotes, the next step); the default `font-ui` (Schibsted Grotesk) for the app talking. `tabular-nums` wherever digits change or line up. Sizes: `text-ui` (body), `text-spoken` (transcript), `text-section` (page headings), `text-topic`; Tailwind's `text-sm`/`text-lg` are fine for small notes and sub-headings.
  - Layout: one left-aligned `max-w-column` column. The `card` utility is for roles only (Topic, transcript, next step), not around every block; add `card-ruled` only on the Topic and transcript cards.
  - No all-caps eyebrow labels, big-number stat tiles or decorative entrance animations. Keyboard focus stays visible (global `:focus-visible` ring; don't remove outlines).
- Routing: React Router v8 (declarative `BrowserRouter` + `Routes`); route table in `frontend/src/App.tsx`, pages in `frontend/src/pages/`.
- TS config uses `verbatimModuleSyntax` (use `import type` for type-only imports) and `erasableSyntaxOnly` (no enums, namespaces, or parameter properties).

Planned pipeline: recording → Deepgram transcription (word timestamps, fillers preserved) → Python metrics → LLM coaching → saved results. Principles:
- Calculate objective metrics (fillers, WPM, pauses) in Python code; use the LLM only for interpretation and suggestions, with structured output.
- Keep the LLM provider (Gemini initially) and transcription provider replaceable behind a thin interface.
- "Confidence" feedback is about wording (hedging), never a measurement of emotion or vocal confidence.
- Out of MVP scope: live coaching, video, pitch/tone/pronunciation analysis, payments.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `bds165/speek`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root, created only when needed. See `docs/agents/domain.md`.
