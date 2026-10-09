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

There are no tests, linter, or build step yet.

## Structure

`guess_number.py` holds everything:
- `MIN_NUMBER` / `MAX_NUMBER` define the range; prompts and validation derive from them, so change the range only there.
- `read_guess()` loops until it gets a valid integer within the range.
- `play()` runs one game: picks the answer, gives higher/lower hints, counts tries.
