# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A small terminal number-guessing game in Python (standard library only, no dependencies). The owner uses this repo to learn AI-assisted development with Claude Code, so keep changes small and explain the reasoning behind each step. User-facing text and explanations are in Japanese.

## Running

```bash
python3 guess_number.py
```

The game reads from stdin interactively, so it cannot be played through Claude Code's Bash tool. To verify behavior non-interactively, pipe input and fix the random seed:

```bash
printf '50\n25\n75\n' | python3 -c "import random, runpy; random.seed(1); runpy.run_path('guess_number.py', run_name='__main__')"
```

## Testing

Tests use the standard-library `unittest` (no install needed). They patch `builtins.input` and `random.randint` to drive the game without a keyboard.

```bash
python3 -m unittest -v                                              # all tests
python3 -m unittest test_guess_number.TestPlay.test_hints_and_try_count  # single test
```

Coverage is measured with coverage.py, installed in a local venv (`.venv/`, git-ignored). Set it up once with `python3 -m venv .venv && .venv/bin/pip install coverage` (on Ubuntu this needs the `python3.14-venv` apt package).

```bash
.venv/bin/coverage run -m unittest && .venv/bin/coverage report -m
```

The only uncovered lines are the `if __name__ == "__main__":` entry points, which is expected.

There is no linter or build step.

## Structure

`guess_number.py` holds everything:
- `MIN_NUMBER` / `MAX_NUMBER` define the range; prompts and validation derive from them, so change the range only there.
- `read_guess()` loops until it gets a valid integer within the range.
- `play()` runs one game: picks the answer, gives higher/lower hints, and ends in a loss after `MAX_TRIES` wrong guesses.
- `main()` repeats `play()` while `ask_play_again()` returns True.
