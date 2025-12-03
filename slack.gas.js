const CONFIG2 = {
    memberSheetName: 'メンバー一覧',
    historyColumn: 3,
    historyRow: 2,
    sendFlagColumn: 4, // 送信ずみかどうか？
    sendFlagRow: 2,
    lastHistorySize: 2 // 抽選履歴のラスト二人に通知を送る
};

const botToken = '';

function sendNotification() {
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