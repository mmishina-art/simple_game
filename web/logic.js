// ヒット＆ブローのルール部分。画面（app.js）から切り離してテストできるようにしている。
// ルールは Python 版（hit_and_blow.py）と同じ。

export const MAX_TRIES = 10;

export const DIFFICULTIES = [
  { name: "かんたん", digits: 3 },
  { name: "ふつう", digits: 4 },
  { name: "むずかしい", digits: 5 },
];

/** 重複のない digits 桁の答えを作る（先頭が 0 でもよい）。 */
export function makeAnswer(digits, random = Math.random) {
  const pool = [..."0123456789"];
  for (let i = 0; i < digits; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, digits).join("");
}

/** { hits, blows } を返す。 */
export function countHitsAndBlows(answer, guess) {
  let hits = 0;
  for (let i = 0; i < answer.length; i++) {
    if (answer[i] === guess[i]) hits++;
  }
  const common = [...guess].filter((c) => answer.includes(c)).length;
  return { hits, blows: common - hits };
}

/** 重複のない digits 桁の数字の並びをすべて返す。 */
function allAnswers(digits, prefix = "") {
  if (prefix.length === digits) return [prefix];
  return [..."0123456789"]
    .filter((c) => !prefix.includes(c))
    .flatMap((c) => allAnswers(digits, prefix + c));
}

/**
 * これまでの結果（[{ guess, hits, blows }]）と矛盾しない答えの候補を全部調べ、
 * どの候補にも含まれない＝答えに使われていないと確定した数字を小さい順に返す。
 */
export function excludedDigits(digits, history) {
  const used = new Set();
  for (const candidate of allAnswers(digits)) {
    const consistent = history.every(({ guess, hits, blows }) => {
      const result = countHitsAndBlows(candidate, guess);
      return result.hits === hits && result.blows === blows;
    });
    if (consistent) {
      for (const c of candidate) used.add(c);
    }
  }
  return [..."0123456789"].filter((c) => !used.has(c));
}

/**
 * best（桁数 → 最少回数）に今回の回数を反映した新しいオブジェクトと、新記録かどうかを返す。
 * 同じ回数は新記録にしない。
 */
export function updateBest(best, digits, tries) {
  const current = best[digits];
  if (current === undefined || tries < current) {
    return { best: { ...best, [digits]: tries }, isNew: true };
  }
  return { best, isNew: false };
}
