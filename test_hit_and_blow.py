"""hit_and_blow.py のテスト。"""

import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

import hit_and_blow


def run_with_inputs(func, inputs, *args):
    """input() に inputs を順に返させて func(*args) を実行し、(戻り値, 画面出力) を返す。"""
    output = io.StringIO()
    with patch("builtins.input", side_effect=inputs), redirect_stdout(output):
        result = func(*args)
    return result, output.getvalue()


def fixed_answer(answer):
    """答えを answer に固定する。"""
    return patch("hit_and_blow.make_answer", return_value=answer)


class TestMakeAnswer(unittest.TestCase):
    def test_has_distinct_digits(self):
        for digits in [3, 4, 5]:
            for _ in range(100):
                answer = hit_and_blow.make_answer(digits)
                self.assertEqual(len(answer), digits)
                self.assertEqual(len(set(answer)), digits)
                self.assertTrue(answer.isdigit())


class TestReadGuess(unittest.TestCase):
    def test_returns_valid_guess(self):
        result, _ = run_with_inputs(hit_and_blow.read_guess, ["0123"], 4)
        self.assertEqual(result, "0123")

    def test_asks_again_for_wrong_length_or_non_digits(self):
        result, output = run_with_inputs(
            hit_and_blow.read_guess, ["123", "12345", "12a4", "１２３４", "1234"], 4
        )
        self.assertEqual(result, "1234")
        self.assertEqual(output.count("桁の数字を入力してください。"), 4)

    def test_asks_again_for_repeated_digits(self):
        result, output = run_with_inputs(hit_and_blow.read_guess, ["1123", "1234"], 4)
        self.assertEqual(result, "1234")
        self.assertIn("同じ数字は使えません。", output)

    def test_returns_none_on_give_up(self):
        for text in ["q", " Q "]:
            with self.subTest(text=text):
                result, _ = run_with_inputs(hit_and_blow.read_guess, [text], 4)
                self.assertIsNone(result)

    def test_uses_given_digit_count(self):
        result, output = run_with_inputs(hit_and_blow.read_guess, ["1234", "123"], 3)
        self.assertEqual(result, "123")
        self.assertIn("3 桁の数字を入力してください。", output)


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
            result, output = run_with_inputs(hit_and_blow.play, ["5678", "1243", "1234"], 4)
        self.assertEqual(result, 3)
        self.assertIn("0 ヒット 0 ブロー", output)
        self.assertIn("2 ヒット 2 ブロー", output)
        self.assertIn("正解！ 3 回で当たりました。", output)
        self.assertIn("残り 8 回です。", output)

    def test_history_lists_all_previous_guesses(self):
        with fixed_answer("1234"):
            _, output = run_with_inputs(hit_and_blow.play, ["5678", "1243", "1234"], 4)
        second_history = output.split("---- これまでの結果 ----")[2]
        self.assertIn(" 1 回目  5678  0 ヒット 0 ブロー", second_history)
        self.assertIn(" 2 回目  1243  2 ヒット 2 ブロー", second_history)

    def test_correct_on_last_try_wins(self):
        inputs = ["5678"] * (hit_and_blow.MAX_TRIES - 1) + ["1234"]
        with fixed_answer("1234"):
            _, output = run_with_inputs(hit_and_blow.play, inputs, 4)
        self.assertIn(f"正解！ {hit_and_blow.MAX_TRIES} 回で当たりました。", output)
        self.assertNotIn("残念！", output)

    def test_game_over_after_max_tries(self):
        inputs = ["5678"] * hit_and_blow.MAX_TRIES
        with fixed_answer("0123"):
            result, output = run_with_inputs(hit_and_blow.play, inputs, 4)
        self.assertIsNone(result)
        self.assertIn("残念！ 正解は 0123 でした。", output)
        self.assertNotIn("正解！", output)
        self.assertNotIn("残り 0 回", output)

    def test_give_up_shows_answer(self):
        with fixed_answer("0123"):
            result, output = run_with_inputs(hit_and_blow.play, ["5678", "q"], 4)
        self.assertIsNone(result)
        self.assertIn("ギブアップ！ 正解は 0123 でした。", output)
        self.assertNotIn("残念！", output)

    def test_other_digit_counts(self):
        for answer, wrong in [("012", "345"), ("01234", "56789")]:
            with self.subTest(answer=answer), fixed_answer(answer):
                _, output = run_with_inputs(hit_and_blow.play, [wrong, answer], len(answer))
                self.assertIn("0 ヒット 0 ブロー", output)
                self.assertIn("正解！ 2 回で当たりました。", output)


class TestChooseDifficulty(unittest.TestCase):
    def test_each_difficulty(self):
        for key, expected in [("1", ("かんたん", 3)), ("2", ("ふつう", 4)), ("3", ("むずかしい", 5))]:
            with self.subTest(key=key):
                result, _ = run_with_inputs(hit_and_blow.choose_difficulty, [key])
                self.assertEqual(result, expected)

    def test_asks_again_for_invalid_choice(self):
        result, output = run_with_inputs(hit_and_blow.choose_difficulty, ["4", "ふつう", " 2 "])
        self.assertEqual(result, ("ふつう", 4))
        self.assertEqual(output.count("1 か 2 か 3 を入力してください。"), 2)


class TestRecordBest(unittest.TestCase):
    def record(self, best, name, tries):
        output = io.StringIO()
        with redirect_stdout(output):
            hit_and_blow.record_best(best, name, tries)
        return output.getvalue()

    def test_first_win_is_new_record(self):
        best = {}
        output = self.record(best, "ふつう", 5)
        self.assertEqual(best, {"ふつう": 5})
        self.assertIn("新記録！ ふつうの最高記録: 5 回", output)

    def test_fewer_tries_updates_record(self):
        best = {"ふつう": 5}
        output = self.record(best, "ふつう", 3)
        self.assertEqual(best, {"ふつう": 3})
        self.assertIn("新記録！ ふつうの最高記録: 3 回", output)

    def test_same_or_more_tries_keeps_record(self):
        for tries in [5, 7]:
            with self.subTest(tries=tries):
                best = {"ふつう": 5}
                output = self.record(best, "ふつう", tries)
                self.assertEqual(best, {"ふつう": 5})
                self.assertNotIn("新記録！", output)
                self.assertIn("ふつうの最高記録: 5 回", output)


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
    def test_tracks_best_per_difficulty(self):
        inputs = [
            "2", "5678", "1243", "1234", "y",  # ふつう 3 回 → 新記録
            "2", "1234", "y",                  # ふつう 1 回 → 新記録
            "2", "5678", "1234", "y",          # ふつう 2 回 → 記録は 1 回のまま
            "1", "012", "n",                   # かんたん 1 回 → 別の記録
        ]
        answers = ["1234", "1234", "1234", "012"]
        with patch("hit_and_blow.make_answer", side_effect=answers):
            _, output = run_with_inputs(hit_and_blow.main, inputs)
        self.assertIn("新記録！ ふつうの最高記録: 3 回", output)
        self.assertIn("新記録！ ふつうの最高記録: 1 回", output)
        self.assertIn("\nふつうの最高記録: 1 回", output)
        self.assertIn("新記録！ かんたんの最高記録: 1 回", output)
        self.assertEqual(output.count("新記録！"), 3)

    def test_loss_does_not_record(self):
        inputs = ["2", "q", "n"]
        with fixed_answer("1234"):
            _, output = run_with_inputs(hit_and_blow.main, inputs)
        self.assertNotIn("最高記録", output)

    def test_plays_until_user_says_no(self):
        with fixed_answer("1234"):
            _, output = run_with_inputs(hit_and_blow.main, ["2", "1234", "y", "2", "1234", "n"])
        self.assertEqual(output.count("ヒット＆ブローを始めます！"), 2)
        self.assertEqual(output.count("ヒット＆ブローのルール"), 1)
        self.assertIn("遊んでくれてありがとう！", output)


if __name__ == "__main__":
    unittest.main()
