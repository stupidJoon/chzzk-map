const Websocket = require('ws');
// const pool = require('./db.js');

const getInitMsg = (cid) => `
{
  "ver": "3",
  "cmd": 100,
  "svcid": "game",
  "cid": "${cid}",
  "bdy": {
    "uid": null,
    "devType": 2001,
    "accTkn": null,
    "auth": "READ",
    "libVer": null,
    "osVer": null,
    "devName": null,
    "locale": null,
    "timezone": null
  },
  "tid": 1
}
`;
const pingMsg = `
{
  "ver":"3",
  "cmd":10000
}
`;

function getChats(channelId, chatId, onClose) {
  const ws = new Websocket('wss://kr-ss1.chat.naver.com/chat');

  ws.on('error', console.log);

  ws.on('close', onClose);

  ws.on('open', () => {
    ws.send(getInitMsg(chatId));
  });

  ws.on('message', (data) => {
    const json = JSON.parse(data.toString('utf8'));
    const { cmd } = json;

    if (cmd === 0) {
      ws.send(pingMsg);
    }
    else if (cmd === 93101) {
      const chats = json.bdy;

      for (const chat of chats) {
        // pool.query(
        //   `INSERT INTO chat (cid, uid)
        //   VALUES (?, ?)
        //   ON DUPLICATE KEY UPDATE cid=?, uid=?, created_at=DEFAULT`,
        //   [channelId, chat.uid, channelId, chat.uid],
        // );
      }
    }
  });
}

module.exports = getChats;
