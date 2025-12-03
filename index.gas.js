/* global SpreadsheetApp, Utilities */

const CONFIG = {
  memberSheetName: 'メンバー一覧',
  memberColumn: 1,
  memberHeaderRow: 1,
  historyColumn: 3,
  historyRow: 2,
  resultSheetName: 'ランダム選択',
  resultDateColumn: 1,
  resultValueColumn: 2,
  resultHeaderRow: 1,
  defaultPickCount: 2,
  sendFlagColumn: 4,
  sendFlagRow: 2,
  lastHistorySize: 2 //履歴がいっぱいになったとき、前回実行だけ残す
};

function runRandomPick(count) {
  const pickCount = Number.isInteger(count) ? count : CONFIG.defaultPickCount;
  const members = getMembers();

  if (members.length === 0) {
    throw new Error('抽選対象のメンバーが見つかりませんでした。');
  }
  if (pickCount < 0 || pickCount > members.length) {
    throw new RangeError('抽選人数がメンバー数を超えています。');
  }

  const history = loadPickHistory(members);
  const { picks, history: updatedHistory } = pickRandomElements(members, pickCount, history);
  commitPickResults(picks);
  savePickHistory(updatedHistory);
  return picks;
}

function getMembers() {
  const sheet = getSheetByName(CONFIG.memberSheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.memberHeaderRow) {
    return [];
  }
  const rowCount = lastRow - CONFIG.memberHeaderRow;
  const memberNames = sheet.getRange(CONFIG.memberHeaderRow + 1, CONFIG.memberColumn, rowCount, 1).getValues();
  const memberIDs = sheet.getRange(CONFIG.memberHeaderRow + 1, CONFIG.memberColumn + 1, rowCount, 1).getValues();

  return memberNames.map((name, i) => ({
    id: String(memberIDs[i][0]),
    name: String(name[0])
  }));
}

function loadPickHistory(source) {
  const sheet = getSheetByName(CONFIG.memberSheetName);
  const raw = sheet.getRange(CONFIG.historyRow, CONFIG.historyColumn).getValue();
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const sourceIDs = source.map(elem => elem.id);
    const seen = new Set();
    const filtered = [];
    parsed.forEach((value) => {
      if (sourceIDs.includes(value.id) && !seen.has(value.id)) {
        filtered.push(value);
        seen.add(value.id);
      }
    });
    return filtered;
  } catch (error) {
    return [];
  }
}

function savePickHistory(history) {
  const sheet = getSheetByName(CONFIG.memberSheetName);
  const value = history.length > 0 ? JSON.stringify(history) : '[]';
  sheet.getRange(CONFIG.historyRow, CONFIG.historyColumn).setValue(value);
  sheet.getRange(CONFIG.sendFlagRow, CONFIG.sendFlagColumn).setValue(false);
}

function commitPickResults(picks) {
  const sheet = getSheetByName(CONFIG.resultSheetName);
  const timestamp = getTimestamp();
  const picksName = picks.map(pick => pick.name);
  sheet.appendRow([timestamp, picksName.join(', ')]);
}

function getTimestamp() {
  const spreadsheet = SpreadsheetApp.getActive();
  const timeZone = spreadsheet.getSpreadsheetTimeZone();
  return Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd HH:mm:ss');
}

function pickRandomElements(source, count, initialHistory) {
  if (!Array.isArray(source)) {
    throw new TypeError('source must be an array');
  }
  if (!Number.isInteger(count)) {
    throw new TypeError('count must be an integer');
  }
  if (count < 0 || count > source.length) {
    throw new RangeError('count must be between 0 and the array length');
  }

  const normalizedSource = [...source];
  const sourceUniqueSize = new Set(normalizedSource).size;
  if (count > sourceUniqueSize) {
    throw new RangeError('count must be between 0 and the number of unique elements');
  }

  let history = Array.isArray(initialHistory) ? [...initialHistory] : [];

  let historyIDs = history.map(elem => elem.id);

  let available = normalizedSource.filter((item) => !historyIDs.includes(item.id));
  const picked = [];
  const pickedSet = new Set();

  while (picked.length < count) {
    if (available.length === 0) {
      if (history.length === sourceUniqueSize) {
        history = history.slice(-CONFIG.lastHistorySize);
        historyIDs = [];
      }
      available = fisherYatesShuffle(normalizedSource).filter(
        (item) => !historyIDs.includes(item.id) && !pickedSet.has(item),
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
    historyIDs.push(next.id);
  }

  const persistedHistory = historyIDs.length === sourceUniqueSize ? history.slice(-CONFIG.lastHistorySize) : history;
  return { picks: picked, history: persistedHistory };
}

function fisherYatesShuffle(source) {
  const pool = [...source];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }
  return pool;
}

function getSheetByName(name) {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    throw new Error(`シート「${name}」が見つかりませんでした。`);
  }
  return sheet;
}
