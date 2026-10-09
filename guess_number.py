"""ターミナルで遊ぶ数当てゲーム。"""

import random

MIN_NUMBER = 1
MAX_NUMBER = 100


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
    tries = 0
    print("数当てゲームを始めます！")

    while True:
        guess = read_guess()
        tries += 1
        if guess < answer:
            print("もっと大きいです。")
        elif guess > answer:
            print("もっと小さいです。")
        else:
            print(f"正解！ {tries} 回で当たりました。")
            break


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
