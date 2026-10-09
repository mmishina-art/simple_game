"""ターミナルで遊ぶヒット＆ブロー。

答えは 0〜9 の数字を重複なしで DIGITS 個並べたもの。
場所も数字も合っていれば「ヒット」、数字だけ合っていれば「ブロー」。
"""

import random

DIGITS = 4
MAX_TRIES = 10
ALL_DIGITS = "0123456789"


def make_answer() -> str:
    """重複のない DIGITS 桁の答えを作る（先頭が 0 でもよい）。"""
    return "".join(random.sample(ALL_DIGITS, DIGITS))


def read_guess() -> str:
    """重複のない DIGITS 桁の数字が入力されるまで聞き直す。"""
    while True:
        text = input(f"{DIGITS} 桁の数字を入力してください: ").strip()
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


def play() -> None:
    answer = make_answer()
    print(f"ヒット＆ブローを始めます！ {MAX_TRIES} 回以内に当ててください。")

    for tries in range(1, MAX_TRIES + 1):
        guess = read_guess()
        hits, blows = count_hits_and_blows(answer, guess)
        if hits == DIGITS:
            print(f"正解！ {tries} 回で当たりました。")
            return
        print(f"{hits} ヒット {blows} ブロー")
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


def main() -> None:
    while True:
        play()
        if not ask_play_again():
            print("遊んでくれてありがとう！")
            break


if __name__ == "__main__":
    main()
