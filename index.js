const fs = require('fs');
const path = require('path');

// 配列の中からランダムに特定の数の要素を選択する関数
// 選択に偏りがでないよう、 Fisher-Yatesアルゴリズムを利用。
const element = ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'];
const STATE_FILE = path.resolve(__dirname, 'current-pick.txt');

/**
 * Fisher-Yatesアルゴリズムを用いて配列から重複なしで要素を抽出する。
 * @param {unknown[]} source - 抽選対象の配列。
 * @param {number} count - 抽出したい要素数。
 * @param {string} [stateFilePath] - 永続化に使用する状態ファイル。
 * @returns {unknown[]} 抽出結果。
 */
function pickRandomElements(source, count, stateFilePath = STATE_FILE) {
	if (!Array.isArray(source)) {
		throw new TypeError('source must be an array');
	}

	if (!Number.isInteger(count)) {
		throw new TypeError('count must be an integer');
	}

	if (count < 0 || count > source.length) {
		throw new RangeError('count must be between 0 and the array length');
	}

	// こんなに厳密に見る必要はないが、一応元配列の重複チェックしておく。
	const normalizedSource = [...source];
	const sourceUniqueSize = new Set(normalizedSource).size;
	if (count > sourceUniqueSize) {
		throw new RangeError('count must be between 0 and the number of unique elements');
	}

	// 抽選履歴を読み出す。
	let history = loadPickHistory(stateFilePath, normalizedSource);
	let historySet = new Set(history);
	let available = normalizedSource.filter((item) => !historySet.has(item));
	const picked = [];
	const pickedSet = new Set();

	// Fisher-Yatesの考え方で残りから無作為に1件ずつ引く。
	// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
	while (picked.length < count) {
		if (available.length === 0) {
			if (historySet.size === sourceUniqueSize) {
				// 全件消化したので新しいサイクルを開始。直前の結果は持ち越す。
				history = history.slice(-1);
				historySet = new Set(history);
			}
			// 実行中にavailableが空になった場合のみ、偏りを防ぐためにシャッフルを実行。
			available = fisherYatesShuffle(normalizedSource).filter(
				(item) => !historySet.has(item) && !pickedSet.has(item),
			);

			if (available.length === 0) {
				throw new Error('No available elements to pick. Ensure source has enough unique values.');
			}
		}

		const randomIndex = Math.floor(Math.random() * available.length);
		const [next] = available.splice(randomIndex, 1);
		if (pickedSet.has(next)) {
			continue;
		}
		picked.push(next);
		pickedSet.add(next);
		history.push(next);
		historySet.add(next);
	}

	const persistedHistory = historySet.size === sourceUniqueSize ? history.slice(-1) : history;
	writePickHistory(stateFilePath, persistedHistory);

	return picked;
}

/**
 * Fisher-Yatesシャッフルで配列全体をランダム化する。
 * @param {unknown[]} source - シャッフル対象。
 * @returns {unknown[]} シャッフル済み配列。
 */
function fisherYatesShuffle(source) {
	const pool = [...source];
	for (let i = pool.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool;
}

/**
 * 永続化された抽選履歴を読み出す。異常値は破棄し、安全な状態に揃える。
 * @param {string} stateFilePath - 状態ファイルのパス。
 * @param {unknown[]} source - 元配列。
 * @returns {unknown[]} 抽選済み履歴。
 */
function loadPickHistory(stateFilePath, source) {
	try {
		if (!fs.existsSync(stateFilePath)) {
			return [];
		}
		const raw = fs.readFileSync(stateFilePath, 'utf8').trim();
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		const sourceSet = new Set(source);
		const seen = new Set();
		const filtered = [];
		for (const value of parsed) {
			if (sourceSet.has(value) && !seen.has(value)) {
				filtered.push(value);
				seen.add(value);
			}
		}
		return filtered;
	} catch (error) {
		return [];
	}
}

/**
 * 状態ファイルへ抽選履歴を書き戻す。
 * @param {string} stateFilePath - 状態ファイルのパス。
 * @param {unknown[]} pickedHistory - 抽選済み履歴。
 * @returns {void}
 */
function writePickHistory(stateFilePath, pickedHistory) {
	fs.writeFileSync(stateFilePath, `${JSON.stringify(pickedHistory, null, 2)}\n`, 'utf8');
}

module.exports = {
	pickRandomElements,
	fisherYatesShuffle,
	loadPickHistory,
	writePickHistory,
};

const selected = pickRandomElements(element, 1);
console.log(selected);
