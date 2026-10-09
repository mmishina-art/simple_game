"""ターミナルで遊ぶ数当てゲーム。"""

import random

MIN_NUMBER = 1
MAX_NUMBER = 100
MAX_TRIES = 10


def read_guess() -> int:
    """数字が入力されるまで聞き直す。"""
    while True:
        text = input(f"{MIN_NUMBER}〜{MAX_NUMBER} の数字を入力してください: ")
        try:
            guess = int(text)
        except ValueError:
            print("数字を入力してください。")
            continue
        if MIN_NUMBER <= guess <= MAX_NUMBER:
            return guess
        print(f"{MIN_NUMBER}〜{MAX_NUMBER} の範囲で入力してください。")


def play() -> None:
    answer = random.randint(MIN_NUMBER, MAX_NUMBER)
    print(f"数当てゲームを始めます！ {MAX_TRIES} 回以内に当ててください。")

    for tries in range(1, MAX_TRIES + 1):
        guess = read_guess()
        if guess == answer:
            print(f"正解！ {tries} 回で当たりました。")
            return
        if guess < answer:
            print("もっと大きいです。")
        else:
            print("もっと小さいです。")
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
