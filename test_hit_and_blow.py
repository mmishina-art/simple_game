"""hit_and_blow.py のテスト。"""

import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

import hit_and_blow


def run_with_inputs(func, inputs):
    """input() に inputs を順に返させて func を実行し、(戻り値, 画面出力) を返す。"""
    output = io.StringIO()
    with patch("builtins.input", side_effect=inputs), redirect_stdout(output):
        result = func()
    return result, output.getvalue()


def fixed_answer(answer):
    """答えを answer に固定する。"""
    return patch("hit_and_blow.make_answer", return_value=answer)


class TestMakeAnswer(unittest.TestCase):
    def test_has_distinct_digits(self):
        for _ in range(100):
            answer = hit_and_blow.make_answer()
            self.assertEqual(len(answer), hit_and_blow.DIGITS)
            self.assertEqual(len(set(answer)), hit_and_blow.DIGITS)
            self.assertTrue(answer.isdigit())


class TestReadGuess(unittest.TestCase):
    def test_returns_valid_guess(self):
        result, _ = run_with_inputs(hit_and_blow.read_guess, ["0123"])
        self.assertEqual(result, "0123")

    def test_asks_again_for_wrong_length_or_non_digits(self):
        result, output = run_with_inputs(
            hit_and_blow.read_guess, ["123", "12345", "12a4", "１２３４", "1234"]
        )
        self.assertEqual(result, "1234")
        self.assertEqual(output.count("桁の数字を入力してください。"), 4)

    def test_asks_again_for_repeated_digits(self):
        result, output = run_with_inputs(hit_and_blow.read_guess, ["1123", "1234"])
        self.assertEqual(result, "1234")
        self.assertIn("同じ数字は使えません。", output)


class TestCountHitsAndBlows(unittest.TestCase):
    def test_examples(self):
        cases = [
            ("1234", "1234", (4, 0)),
            ("1234", "5678", (0, 0)),
            ("1234", "4321", (0, 4)),
            ("1234", "1243", (2, 2)),
            ("1234", "1567", (1, 0)),
            ("1234", "5167", (0, 1)),
            ("1234", "1395", (1, 1)),
        ]
        for answer, guess, expected in cases:
            with self.subTest(answer=answer, guess=guess):
                self.assertEqual(hit_and_blow.count_hits_and_blows(answer, guess), expected)


class TestPlay(unittest.TestCase):
    def test_hints_and_try_count(self):
        with fixed_answer("1234"):
            _, output = run_with_inputs(hit_and_blow.play, ["5678", "1243", "1234"])
        self.assertIn("0 ヒット 0 ブロー", output)
        self.assertIn("2 ヒット 2 ブロー", output)
        self.assertIn("正解！ 3 回で当たりました。", output)
        self.assertIn("残り 8 回です。", output)

    def test_correct_on_last_try_wins(self):
        inputs = ["5678"] * (hit_and_blow.MAX_TRIES - 1) + ["1234"]
        with fixed_answer("1234"):
            _, output = run_with_inputs(hit_and_blow.play, inputs)
        self.assertIn(f"正解！ {hit_and_blow.MAX_TRIES} 回で当たりました。", output)
        self.assertNotIn("残念！", output)

    def test_game_over_after_max_tries(self):
        inputs = ["5678"] * hit_and_blow.MAX_TRIES
        with fixed_answer("0123"):
            _, output = run_with_inputs(hit_and_blow.play, inputs)
        self.assertIn("残念！ 正解は 0123 でした。", output)
        self.assertNotIn("正解！", output)
        self.assertNotIn("残り 0 回", output)


class TestAskPlayAgain(unittest.TestCase):
    def test_yes(self):
        result, _ = run_with_inputs(hit_and_blow.ask_play_again, [" Y "])
        self.assertTrue(result)

    def test_no(self):
        result, _ = run_with_inputs(hit_and_blow.ask_play_again, ["n"])
        self.assertFalse(result)

    def test_asks_again_for_invalid_answer(self):
        result, output = run_with_inputs(hit_and_blow.ask_play_again, ["maybe", "n"])
        self.assertFalse(result)
        self.assertIn("y か n を入力してください。", output)


class TestMain(unittest.TestCase):
    def test_plays_until_user_says_no(self):
        with fixed_answer("1234"):
            _, output = run_with_inputs(hit_and_blow.main, ["1234", "y", "1234", "n"])
        self.assertEqual(output.count("ヒット＆ブローを始めます！"), 2)
        self.assertIn("遊んでくれてありがとう！", output)


if __name__ == "__main__":
    unittest.main()
