# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A small terminal Hit & Blow game (4 distinct digits, "hits" = right digit in the right place, "blows" = right digit in the wrong place) in Python (standard library only, no dependencies). The owner uses this repo to learn AI-assisted development with Claude Code, so keep changes small and explain the reasoning behind each step. User-facing text and explanations are in Japanese.

## Running

```bash
python3 hit_and_blow.py
```

The game reads from stdin interactively, so it cannot be played through Claude Code's Bash tool. To verify behavior non-interactively, pipe input and fix the random seed:

```bash
printf '0123\n4567\n' | python3 -c "import random, runpy; random.seed(1); runpy.run_path('hit_and_blow.py', run_name='__main__')"
```

## Testing

Tests use the standard-library `unittest` (no install needed). They patch `builtins.input` and `hit_and_blow.make_answer` to drive the game without a keyboard.

```bash
python3 -m unittest -v                                              # all tests
python3 -m unittest test_hit_and_blow.TestPlay.test_hints_and_try_count  # single test
```

Coverage is measured with coverage.py, installed in a local venv (`.venv/`, git-ignored). Set it up once with `python3 -m venv .venv && .venv/bin/pip install coverage` (on Ubuntu this needs the `python3.14-venv` apt package).

```bash
.venv/bin/coverage run -m unittest && .venv/bin/coverage report -m
```

The only uncovered lines are the `if __name__ == "__main__":` entry points, which is expected.

There is no linter or build step.

## Structure

`hit_and_blow.py` holds everything:
- `DIGITS` / `MAX_TRIES` are the game's settings; prompts, validation and tests derive from them, so change them only there.
- Answers and guesses are strings, not ints, so a leading `0` is kept.
- `count_hits_and_blows()` is the core scoring logic; `read_guess()` rejects wrong length, non-ASCII digits and repeated digits.
- `play()` runs one game and ends in a loss after `MAX_TRIES` wrong guesses.
- `main()` repeats `play()` while `ask_play_again()` returns True.
