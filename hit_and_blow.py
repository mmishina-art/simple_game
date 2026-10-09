"""ターミナルで遊ぶヒット＆ブロー。

答えは 0〜9 の数字を重複なしで、選んだ難易度の桁数だけ並べたもの。
場所も数字も合っていれば「ヒット」、数字だけ合っていれば「ブロー」。
"""

import random

MAX_TRIES = 10
ALL_DIGITS = "0123456789"
GIVE_UP = "q"
# 入力する番号: (難易度の名前, 桁数)
DIFFICULTIES = {
    "1": ("かんたん", 3),
    "2": ("ふつう", 4),
    "3": ("むずかしい", 5),
}


def make_answer(digits: int) -> str:
    """重複のない digits 桁の答えを作る（先頭が 0 でもよい）。"""
    return "".join(random.sample(ALL_DIGITS, digits))


def read_guess(digits: int) -> str | None:
    """重複のない digits 桁の数字が入力されるまで聞き直す。ギブアップなら None。"""
    while True:
        text = input(f"{digits} 桁の数字を入力してください（{GIVE_UP} でギブアップ）: ").strip()
        if text.lower() == GIVE_UP:
            return None
        if len(text) != digits or any(c not in ALL_DIGITS for c in text):
            print(f"{digits} 桁の数字を入力してください。")
        elif len(set(text)) != digits:
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


def play(digits: int) -> int | None:
    """1 ゲーム遊ぶ。勝ったら回数、負け・ギブアップなら None を返す。"""
    answer = make_answer(digits)
    history = []
    print(f"ヒット＆ブローを始めます！ {MAX_TRIES} 回以内に当ててください。")

    for tries in range(1, MAX_TRIES + 1):
        guess = read_guess(digits)
        if guess is None:
            print(f"ギブアップ！ 正解は {answer} でした。")
            return None
        hits, blows = count_hits_and_blows(answer, guess)
        if hits == digits:
            print(f"正解！ {tries} 回で当たりました。")
            return tries
        history.append((guess, hits, blows))
        print_history(history)
        if tries < MAX_TRIES:
            print(f"残り {MAX_TRIES - tries} 回です。")

    print(f"残念！ 正解は {answer} でした。")
    return None


def choose_difficulty() -> tuple[str, int]:
    """難易度が選ばれるまで聞き直し、(難易度の名前, 桁数) を返す。"""
    choices = " / ".join(f"{key}: {name}（{digits} 桁）" for key, (name, digits) in DIFFICULTIES.items())
    while True:
        text = input(f"難易度を選んでください [{choices}]: ").strip()
        if text in DIFFICULTIES:
            return DIFFICULTIES[text]
        print(f"{' か '.join(DIFFICULTIES)} を入力してください。")


def record_best(best: dict[str, int], name: str, tries: int) -> None:
    """best（難易度の名前 → 最少回数）を更新し、その難易度の最高記録を表示する。"""
    if name not in best or tries < best[name]:
        best[name] = tries
        print(f"新記録！ {name}の最高記録: {tries} 回")
    else:
        print(f"{name}の最高記録: {best[name]} 回")


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
    print("・0〜9 の数字を重複なしで並べた答えを当てます（先頭が 0 のこともあります）。")
    print("・桁数は難易度で決まります。")
    print("・数字も場所も合っていれば「ヒット」、数字だけ合っていれば「ブロー」です。")
    print("  例: 答えが 1234 で 1395 と入力すると、1 ヒット 1 ブロー")
    print(f"・{MAX_TRIES} 回以内に全部ヒットにすれば勝ちです。")
    print(f"・{GIVE_UP} を入力するとギブアップして答えを見られます。")
    print("================================")


def main() -> None:
    print_rules()
    best: dict[str, int] = {}
    while True:
        name, digits = choose_difficulty()
        tries = play(digits)
        if tries is not None:
            record_best(best, name, tries)
        if not ask_play_again():
            print("遊んでくれてありがとう！")
            break


if __name__ == "__main__":
    main()
