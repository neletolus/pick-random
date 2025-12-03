const CONFIG2 = {
    memberSheetName: 'メンバー一覧',
    historyColumn: 3,
    historyRow: 2,
    sendFlagColumn: 4, // 送信ずみかどうか？
    sendFlagRow: 2,
    lastHistorySize: 2 // 抽選履歴のラスト二人に通知を送る
};

const botToken = '';

/**
* 休日かどうかを判定する関数
* 
* @param  {Date}    判定する日付
* @return {boolean} 休日ならtrueを返す
*/
function isHoliday_(date) {

    // ①土日の判定  
    const day = date.getDay(); //曜日取得
    if (day === 0 || day === 6) return true;

    // ②祝日の判定
    const id = 'ja.japanese#holiday@group.v.calendar.google.com'
    const cal = CalendarApp.getCalendarById(id);
    const events = cal.getEventsForDay(date);
    //なんらかのイベントがある＝祝日
    if (events.length) return true;

    // 必要なら特定の休日入れる。
    // ③特定の休日判定
    //   const specialHoliday = [
    //     '0813',
    //     '0814',
    //     '0815',
    //     '0816',
    //     '0817'
    //   ];

    //const mmdd = Utilities.formatDate(date, 'JST', 'MMdd');

    //someメソッドでtrue/falseいずれかが返る
    //return specialHoliday.some(value => value === mmdd);
    return false
}

function sendNotification() {
    if (isHoliday_(new Date())) {
        return;
    }
    const sheet = getSheetByName(CONFIG2.memberSheetName);
    const raw = sheet.getRange(CONFIG2.historyRow, CONFIG2.historyColumn).getValue();
    if (!raw) {
        return;
    }
    const sendFlag = sheet.getRange(CONFIG2.sendFlagRow, CONFIG2.sendFlagColumn).getValue();
    if (sendFlag) {
        return;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return;
        }
        const history = parsed.slice(-CONFIG2.lastHistorySize);
        const historyIDs = history.map(elem => elem.id);
        const slackApp = SlackApp.create(botToken);
        const channelId = "#pj_wecall_product_プロダクト開発用";
        const message = `
<@${historyIDs[0]}> <@${historyIDs[1]}>
本日のレビュアーはお二人です！
よろしくお願いします:arigato:
        `;
        slackApp.postMessage(channelId, message);
        sheet.getRange(CONFIG2.sendFlagRow, CONFIG2.sendFlagColumn).setValue(true);
    } catch (error) {
        console.error(error);
    }
}