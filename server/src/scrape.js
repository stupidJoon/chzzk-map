import WebSocket from 'ws';
import * as db from './db.js';

const scrapingChannels = new Set();

export async function scanChannels() {
  // let lives = await fetchLivesPages(process.env.MIN_LIVE_USER);
  let lives = await fetchLivesPages(1000);

  lives = lives.filter((live) => live.adult === false);
  
  lives = await sequentialMap(lives, async (live) => {
    const { followerCount } = await fetchChannel(live.channel.channelId);
    const { chatChannelId } = await fetchLiveDetail(live.channel.channelId);
    return { ...live, chatChannelId, channel: { ...live.channel, followerCount } };
  });
  
  lives.forEach((live) => db.insertChannel(live.channel));

  lives = lives.filter((live) => !scrapingChannels.has(live.channel.channelId));
  
  lives.forEach((live) => listenChats(live, (chats) => db.insertChats(live, chats)));
}

function log(...args) {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
  console.log(now, ...args);
}
async function sequentialMap(array, asyncCallback) {
  return array.reduce(async (accPromise, item) => {
    const acc = await accPromise;
    try {
      const result = await asyncCallback(item);
      return [...acc, result];
    }
    catch (err) {
      log(err);
      return acc;
    }
  }, Promise.resolve([]));
}

async function fetchLives(next) {
  const url = next
    ? `https://api.chzzk.naver.com/service/v1/lives?size=50&sortType=POPULAR&concurrentUserCount=${next.concurrentUserCount}&liveId=${next.liveId}`
    : 'https://api.chzzk.naver.com/service/v1/lives?size=50&sortType=POPULAR';
  
  const json = await fetch(url, { headers: { 'User-Agent': 'Mozilla' } }).then((res) => res.json());
  return { lives: json.content.data, next: json.content.page.next };
}
async function fetchLivesPages(minUser) {
  const validLives = [];
  let lives, next, filteredLives;
  do {
    ({ lives, next } = await fetchLives(next));
    filteredLives = lives.filter((live) => live.concurrentUserCount >= minUser);
    validLives.push(...filteredLives);
  } while (lives.length === filteredLives.length);
  return validLives;
}
async function fetchLiveDetail(channelId) {
  const url = `https://api.chzzk.naver.com/service/v3/channels/${channelId}/live-detail`;
  const json = await fetch(url, { headers: { 'User-Agent': 'Mozilla' } }).then((res) => res.json());
  return json.content;
}
async function fetchChannel(channelId) {
  const url = `https://api.chzzk.naver.com/service/v1/channels/${channelId}`;
  const json = await fetch(url, { headers: { 'User-Agent': 'Mozilla' } }).then((res) => res.json());
  return json.content;
}

const WS_MSG = {
  INIT: (cid) => ({
    ver: '3',
    cmd: 100,
    svcid: 'game',
    cid: `${cid}`,
    tid: 1,
    bdy: {
      uid: null,
      devType: 2001,
      accTkn: null,
      auth: 'READ',
      libVer: null,
      osVer: null,
      devName: null,
      locale: null,
      timezone: null
    },
  }),
  PING: {
    ver: 3,
    cmd: 0,
  },
  PONG: {
    ver: 3,
    cmd: 10000,
  },
}
function listenChats(live, cb) {
  const ws = new WebSocket('wss://kr-ss1.chat.naver.com/chat');

  const interval = setInterval(async () => {
    const { openLive } = await fetchChannel(live.channel.channelId);
    if (!openLive) return ws.close();
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(WS_MSG.PING));
  }, 20 * 1000);

  ws.on('error', log);

  ws.on('open', async () => {
    ws.send(JSON.stringify(WS_MSG.INIT(live.chatChannelId)));
    scrapingChannels.add(live.channel.channelId);
    log('Opened!', live.channel.channelId, scrapingChannels, await fetchChannel(live.channel.channelId));
  });

  ws.on('close', async (event) => {
    clearInterval(interval);
    scrapingChannels.delete(live.channel.channelId);
    log('Closed!', live.channel.channelId, scrapingChannels, event, await fetchChannel(live.channel.channelId));
  });

  ws.on('message', (data) => {
    const { cmd, bdy } = JSON.parse(data.toString('utf8'));
    if (cmd === 0) ws.send(JSON.stringify(WS_MSG.PONG));
    else if (cmd === 93101) cb(bdy);
  });
}
