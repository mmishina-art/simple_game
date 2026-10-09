import assert from "node:assert/strict";
import { test } from "node:test";

import { countHitsAndBlows, excludedDigits, makeAnswer, updateBest } from "./logic.js";

test("makeAnswer は重複のない数字を指定の桁数だけ並べる", () => {
  for (const digits of [3, 4, 5]) {
    for (let i = 0; i < 100; i++) {
      const answer = makeAnswer(digits);
      assert.equal(answer.length, digits);
      assert.equal(new Set(answer).size, digits);
      assert.match(answer, /^[0-9]+$/);
    }
  }
});

test("makeAnswer は先頭が 0 の答えも作れる", () => {
  assert.equal(makeAnswer(4, () => 0), "0123");
});

test("countHitsAndBlows は Python 版と同じ結果になる", () => {
  const cases = [
    ["1234", "1234", 4, 0],
    ["1234", "5678", 0, 0],
    ["1234", "4321", 0, 4],
    ["1234", "1243", 2, 2],
    ["1234", "1567", 1, 0],
    ["1234", "5167", 0, 1],
    ["1234", "1395", 1, 1],
  ];
  for (const [answer, guess, hits, blows] of cases) {
    assert.deepEqual(countHitsAndBlows(answer, guess), { hits, blows }, `${answer} / ${guess}`);
  }
});

test("updateBest: 初回と少ない回数は新記録", () => {
  let result = updateBest({}, 4, 5);
  assert.deepEqual(result, { best: { 4: 5 }, isNew: true });
  result = updateBest(result.best, 4, 3);
  assert.deepEqual(result, { best: { 4: 3 }, isNew: true });
});

test("updateBest: 同じ回数・多い回数は更新しない", () => {
  for (const tries of [5, 7]) {
    assert.deepEqual(updateBest({ 4: 5 }, 4, tries), { best: { 4: 5 }, isNew: false });
  }
});

test("updateBest: 難易度ごとの記録は混ざらない", () => {
  const { best } = updateBest({ 4: 5 }, 3, 2);
  assert.deepEqual(best, { 3: 2, 4: 5 });
});

test("excludedDigits: 予想がまだないときは何も確定しない", () => {
  assert.deepEqual(excludedDigits(4, []), []);
});

test("excludedDigits: 0 ヒット 0 ブローの予想の数字は確定で使われていない", () => {
  const history = [{ guess: "5678", hits: 0, blows: 0 }];
  assert.deepEqual(excludedDigits(4, history), ["5", "6", "7", "8"]);
});

test("excludedDigits: 全部ブローなら、ほかの数字が全部確定する", () => {
  const history = [{ guess: "0123", hits: 0, blows: 4 }];
  assert.deepEqual(excludedDigits(4, history), ["4", "5", "6", "7", "8", "9"]);
});

test("excludedDigits: 複数の予想を組み合わせて推理する", () => {
  // 012 と 345 で合わせて 3 個見つかった → 6〜9 は使われていない
  const history = [
    { guess: "012", hits: 1, blows: 0 },
    { guess: "345", hits: 0, blows: 2 },
  ];
  assert.deepEqual(excludedDigits(3, history), ["6", "7", "8", "9"]);
});

test("excludedDigits: 本当の答えの数字が「使われていない」と出ることはない", () => {
  for (const digits of [3, 4, 5]) {
    for (let round = 0; round < 20; round++) {
      const answer = makeAnswer(digits);
      const history = [];
      for (let i = 0; i < 3; i++) {
        const guess = makeAnswer(digits);
        history.push({ guess, ...countHitsAndBlows(answer, guess) });
      }
      const excluded = excludedDigits(digits, history);
      for (const c of answer) {
        assert.ok(!excluded.includes(c), `answer ${answer} history ${JSON.stringify(history)}`);
      }
    }
  }
});
