"""guess_number.py のテスト。"""

import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

import guess_number


def run_with_inputs(func, inputs):
    """input() に inputs を順に返させて func を実行し、(戻り値, 画面出力) を返す。"""
    output = io.StringIO()
    with patch("builtins.input", side_effect=inputs), redirect_stdout(output):
        result = func()
    return result, output.getvalue()


class TestReadGuess(unittest.TestCase):
    def test_returns_valid_number(self):
        result, _ = run_with_inputs(guess_number.read_guess, ["42"])
        self.assertEqual(result, 42)

    def test_asks_again_for_non_number(self):
        result, output = run_with_inputs(guess_number.read_guess, ["abc", "42"])
        self.assertEqual(result, 42)
        self.assertIn("数字を入力してください。", output)

    def test_asks_again_for_out_of_range(self):
        result, output = run_with_inputs(guess_number.read_guess, ["0", "101", "100"])
        self.assertEqual(result, 100)
        self.assertEqual(output.count("の範囲で入力してください。"), 2)


class TestPlay(unittest.TestCase):
    def test_hints_and_try_count(self):
        with patch("random.randint", return_value=30):
            _, output = run_with_inputs(guess_number.play, ["50", "10", "30"])
        self.assertIn("もっと小さいです。", output)
        self.assertIn("もっと大きいです。", output)
        self.assertIn("正解！ 3 回で当たりました。", output)


class TestAskPlayAgain(unittest.TestCase):
    def test_yes(self):
        result, _ = run_with_inputs(guess_number.ask_play_again, [" Y "])
        self.assertTrue(result)

    def test_no(self):
        result, _ = run_with_inputs(guess_number.ask_play_again, ["n"])
        self.assertFalse(result)

    def test_asks_again_for_invalid_answer(self):
        result, output = run_with_inputs(guess_number.ask_play_again, ["maybe", "n"])
        self.assertFalse(result)
        self.assertIn("y か n を入力してください。", output)


class TestMain(unittest.TestCase):
    def test_plays_until_user_says_no(self):
        with patch("random.randint", return_value=30):
            _, output = run_with_inputs(guess_number.main, ["30", "y", "30", "n"])
        self.assertEqual(output.count("数当てゲームを始めます！"), 2)
        self.assertIn("遊んでくれてありがとう！", output)


if __name__ == "__main__":
    unittest.main()
