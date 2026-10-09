# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A small terminal Hit & Blow game (3–5 distinct digits depending on difficulty, "hits" = right digit in the right place, "blows" = right digit in the wrong place) with two front ends: a terminal version in Python (`hit_and_blow.py`, standard library only) and a smartphone-friendly web version in plain HTML/CSS/JavaScript (`web/`, no build step or dependencies). Keep the rules of the two versions in sync. The owner uses this repo to learn AI-assisted development with Claude Code, so keep changes small and explain the reasoning behind each step. User-facing text and explanations are in Japanese.

## Running

```bash
python3 hit_and_blow.py
```

The game reads from stdin interactively, so it cannot be played through Claude Code's Bash tool. To verify behavior non-interactively, pipe input and fix the random seed:

```bash
printf '2\n0123\nq\nn\n' | python3 -c "import random, runpy; random.seed(1); runpy.run_path('hit_and_blow.py', run_name='__main__')"
```

### Web version

```bash
python3 -m http.server -d web 8000   # then open http://localhost:8000
```

ES modules need to be served over HTTP; opening `index.html` as a file does not work.

## Testing

Tests use the standard-library `unittest` (no install needed). They patch `builtins.input` and `hit_and_blow.make_answer` to drive the game without a keyboard.

```bash
python3 -m unittest -v                                              # all tests
python3 -m unittest test_hit_and_blow.TestPlay.test_hints_and_try_count  # single test
```

Coverage is measured with coverage.py, installed in a local venv (`.venv/`, git-ignored). Set it up once with `python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt` (on Ubuntu this needs the `python3.14-venv` apt package).

```bash
.venv/bin/coverage run -m unittest && .venv/bin/coverage report -m
```

The only uncovered lines are the `if __name__ == "__main__":` entry points, which is expected.

Web logic tests use Node's built-in test runner (no install): `npm test` runs `web/*.test.js`.

UI tests use Playwright (`e2e/`, config in `playwright.config.js`) in headless Chromium with a Pixel 7 mobile profile. The config starts `python3 -m http.server` on port 4173 itself. Tests stub `Math.random` to 0, so answers are `012` / `0123` / `01234`. The config sets `reducedMotion: "reduce"` so reveals are instant; tests that check animations opt out with `test.use({ reducedMotion: "no-preference" })` and must not assert on short-lived intermediate states directly (record them with a `MutationObserver` instead). Sound tests listen for `hb:sound` (`e2e/effects.spec.js`).

```bash
npm ci && npx playwright install chromium   # once (system libs: npx playwright install-deps chromium, needs sudo)
npm run test:e2e                            # all UI tests
npx playwright test -g "ギブアップ"          # tests whose name matches
```

GitHub Actions (`.github/workflows/test.yml`) runs the Python tests on Python 3.14, `npm test` on Node 24, and the Playwright UI tests for pushes to `main` and for every pull request (feature-branch pushes are covered by the PR run, so they are not run twice). There is no linter or build step.

## Linting

Lint only (no formatter, by the owner's choice): Ruff for Python (`pyproject.toml`) and ESLint for JavaScript (`eslint.config.js`, flat config). Python dev tools are pinned in `requirements-dev.txt`. The `lint` job in Actions runs both.

```bash
.venv/bin/pip install -r requirements-dev.txt   # once
.venv/bin/ruff check .
npm run lint
```

In `eslint.config.js`, `web/` gets browser globals, `web/sw.js` service-worker globals, and `e2e/` both Node and browser globals because `page.evaluate()` callbacks run in the page.

## Structure

`hit_and_blow.py` holds everything:
- `DIFFICULTIES` maps the menu key to (name, digit count); `MAX_TRIES` and `GIVE_UP` are the other settings. The digit count is passed as an argument (`digits`) through `make_answer()`, `read_guess()` and `play()` rather than stored globally.
- Answers and guesses are strings, not ints, so a leading `0` is kept.
- `count_hits_and_blows()` is the core scoring logic; `read_guess()` rejects wrong length, non-ASCII digits and repeated digits, and returns `None` when the player gives up.
- `play()` runs one game, shows the full guess history via `print_history()` after each miss, and returns the number of tries on a win or `None` on a loss (after `MAX_TRIES` misses) or give-up.
- `main()` shows `print_rules()` once, then loops: `choose_difficulty()` → `play()` → `record_best()` (wins only) → `ask_play_again()`.
- High scores live only in memory: `main()` keeps a `best` dict of difficulty name → fewest tries, which `record_best()` updates (a tie is not a new record).
- Tests call functions through `run_with_inputs(func, inputs, *args)` and fix the answer with `fixed_answer()`.

`web/` (published to GitHub Pages by `.github/workflows/pages.yml` on pushes to `main` that touch `web/`):
- `logic.js` holds the rules as pure functions (`makeAnswer`, `countHitsAndBlows`, `updateBest`) mirroring the Python version; `logic.test.js` tests them.
- Hint mode (web only): `excludedDigits()` brute-forces every answer consistent with the history and returns digits that appear in none of them; `app.js` strikes those digits through on the keypad but keeps them pressable. A win in a game where the hint was shown at any point is not recorded as a best score (`state.usedHint`).
- `app.js` handles the DOM only; sounds and animations live in `effects.js`. The on-screen keypad disables used digits, so duplicate digits can't be entered.
- Best scores are keyed by digit count and saved in `localStorage` (wrapped in try/catch so the game still works without it). `app.js` also calls `navigator.storage.persist()` so the browser is less likely to evict them. The storage key `hit-and-blow-best` must not change, or players lose their records.
- `effects.js`: sounds are synthesized with the Web Audio API (no audio files; respects the iPhone silent switch). `playSound(name)` / `playSoundLater(delaySec, name)` always dispatch a `hb:sound` event on `document` (`detail: { name, played, delay }`) so tests can assert which sounds fired; the on/off setting is in `localStorage` key `hit-and-blow-sound` (default on). Also `confetti()`, `vibrate()` (Android only) and `wait()`.
- After each guess, `submitGuess()` reveals hits then blows one at a time (`state.revealing` disables input meanwhile). Under `prefers-reduced-motion: reduce`, `wait()` returns immediately, animations are disabled in CSS and confetti is skipped, but the reveal sounds are still spaced out with `playSoundLater` so they don't play at once. The hint's `excludedDigits()` result is cached per history (`cachedExcludedDigits`) because render runs on every reveal step. `#announce` (visually hidden, `aria-live`) reads each result to screen readers.
- The page background is tinted by the latest result: `renderBackground()` sets `--heat` (hits×2 + blows over digits×2) and `--hit-share` on `body`, and CSS mixes green/yellow into the background up to `--tint-max` (kept low on purpose). Elements toggled with the `hidden` attribute rely on the global `[hidden] { display: none !important; }` rule, because classes like `.actions` set `display`.
- It is a PWA: `manifest.webmanifest` plus `sw.js`, a network-first service worker that caches the files for offline play. **When adding a file under `web/`, add it to `FILES` in `sw.js`.** Network-first means updates show up without bumping `CACHE`; change `CACHE` only to force old caches to be dropped.
- Icons in `web/icons/` are generated by `python3 tools/make_icons.py` (standard library only); edit the colors/shapes there and rerun instead of editing the PNGs.
