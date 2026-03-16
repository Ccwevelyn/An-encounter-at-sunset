/**
 * 聊天相关常量，单一数据源。第三个角色仅使用「知心姐姐」，无其他别名。
 */
export const BOT_IDS = [0, 1, 2];
export const BOT_NAMES = {
  0: '最伟大最尊敬的导师',
  1: '看不上你对象的朋友',
  2: '知心姐姐',
};

export function isBotId(partnerId) {
  return BOT_IDS.includes(Number(partnerId));
}

/** 判断一条消息是否为自己发送：sender_id 与当前用户一致且非 bot */
export function isMineMessage(msg, myId) {
  const sid = msg.sender_id != null ? Number(msg.sender_id) : NaN;
  if (Number.isNaN(sid) || myId <= 0) return false;
  if (BOT_IDS.includes(sid)) return false;
  return sid === myId;
}
