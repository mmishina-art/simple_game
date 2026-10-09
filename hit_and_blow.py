"""ターミナルで遊ぶヒット＆ブロー。

答えは 0〜9 の数字を重複なしで DIGITS 個並べたもの。
場所も数字も合っていれば「ヒット」、数字だけ合っていれば「ブロー」。
"""

import random

DIGITS = 4
MAX_TRIES = 10
ALL_DIGITS = "0123456789"
GIVE_UP = "q"


def make_answer() -> str:
    """重複のない DIGITS 桁の答えを作る（先頭が 0 でもよい）。"""
    return "".join(random.sample(ALL_DIGITS, DIGITS))


def read_guess() -> str | None:
    """重複のない DIGITS 桁の数字が入力されるまで聞き直す。ギブアップなら None。"""
    while True:
        text = input(f"{DIGITS} 桁の数字を入力してください（{GIVE_UP} でギブアップ）: ").strip()
        if text.lower() == GIVE_UP:
            return None
        if len(text) != DIGITS or any(c not in ALL_DIGITS for c in text):
            print(f"{DIGITS} 桁の数字を入力してください。")
        elif len(set(text)) != DIGITS:
            print("同じ数字は使えません。")
        else:
            return text


def count_hits_and_blows(answer: str, guess: str) -> tuple[int, int]:
    """(ヒット数, ブロー数) を返す。"""
    hits = sum(a == g for a, g in zip(answer, guess))
    common = len(set(answer) & set(guess))
    return hits, common - hits


def print_history(history: list[tuple[str, int, int]]) -> None:
    """これまでの (予想, ヒット数, ブロー数) を一覧で表示する。"""
    print("---- これまでの結果 ----")
    for i, (guess, hits, blows) in enumerate(history, start=1):
        print(f"{i:>2} 回目  {guess}  {hits} ヒット {blows} ブロー")
    print("------------------------")


def play() -> None:
    answer = make_answer()
    history = []
    print(f"ヒット＆ブローを始めます！ {MAX_TRIES} 回以内に当ててください。")

    for tries in range(1, MAX_TRIES + 1):
        guess = read_guess()
        if guess is None:
            print(f"ギブアップ！ 正解は {answer} でした。")
            return
        hits, blows = count_hits_and_blows(answer, guess)
        if hits == DIGITS:
            print(f"正解！ {tries} 回で当たりました。")
            return
        history.append((guess, hits, blows))
        print_history(history)
        if tries < MAX_TRIES:
            print(f"残り {MAX_TRIES - tries} 回です。")

    print(f"残念！ 正解は {answer} でした。")


def ask_play_again() -> bool:
    """y か n が入力されるまで聞き直す。"""
    while True:
        text = input("もう一度遊びますか？ (y/n): ").strip().lower()
        if text == "y":
            return True
        if text == "n":
            return False
        print("y か n を入力してください。")


def print_rules() -> None:
    print("==== ヒット＆ブローのルール ====")
    print(f"・0〜9 の数字を重複なしで {DIGITS} つ並べた答えを当てます（先頭が 0 のこともあります）。")
    print("・数字も場所も合っていれば「ヒット」、数字だけ合っていれば「ブロー」です。")
    print("  例: 答えが 1234 で 1395 と入力すると、1 ヒット 1 ブロー")
    print(f"・{MAX_TRIES} 回以内に {DIGITS} ヒットにすれば勝ちです。")
    print(f"・{GIVE_UP} を入力するとギブアップして答えを見られます。")
    print("================================")


def main() -> None:
    print_rules()
    while True:
        play()
        if not ask_play_again():
            print("遊んでくれてありがとう！")
            break


if __name__ == "__main__":
    main()
