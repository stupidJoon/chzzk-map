import * as db from './db.js';
import { from } from 'rxjs';
import { filter, concatMap, tap, toArray } from 'rxjs/operators';
import WebSocket from 'ws';

index();
async function index() {
  const lives = await fetchLivesPages(process.env.MIN_LIVE_USER);
  const scrapingLives = db.selectScrapingLives();

  const observable = from(lives).pipe(
    filter((live) => live.adult === false),
    concatMap(async (live) => {
      await sleep(1000);
      const { chatChannelId } = await fetchLiveDetail(live.channel.channelId);
      return { ...live, chatChannelId };
    }),
    concatMap(async (live) => {
      const { followerCount } = await fetchChannel(live.channel.channelId);
      return { ...live, channel: { ...live.channel, followerCount } };
    }),
    tap((live) => db.insertChannel(live.channel)),
    filter((live) => scrapingLives.every((scrapingChannel) => scrapingChannel.channelId !== live.channel.channelId)),
    tap((live) => getChats(live)),
  );

  observable.subscribe();
}

function log(...args) {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
  console.log(now, ...args);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const url = `https://api.chzzk.naver.com/service/v3/channels/${channelId}/live-detail`
  const json = await fetch(url, { headers: { 'User-Agent': 'Mozilla' } }).then((res) => res.json());
  return json.content;
}
async function fetchChannel(channelId) {
  const url = `https://api.chzzk.naver.com/service/v1/channels/${channelId}`;
  const json = await fetch(url, { headers: { 'User-Agent': 'Mozilla' } }).then((res) => res.json());
  return json.content;
}

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
  "cmd":0
}
`;
const pongMsg = `
{
  "ver":"3",
  "cmd":10000
}
`;
function getChats(live) {
  log('chat opened!', live);

  db.insertScrapingLives(live)
  const ws = new WebSocket('wss://kr-ss1.chat.naver.com/chat');

  const interval = setInterval(async () => {
    const { openLive } = await fetchChannel(live.channel.channelId);
    if (!openLive) return ws.close();
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(pingMsg);
  }, 20 * 1000);

  ws.on('error', log);

  ws.on('close', () => {
    log('chat closed!', live);
    db.deleteScrapingLives(live);
    clearInterval(interval);
  });
  
  ws.on('open', () => ws.send(getInitMsg(live.chatChannelId,)));

  ws.on('message', (data) => {
    const { cmd, bdy } = JSON.parse(data.toString('utf8'));

    if (cmd === 0) {
      ws.send(pongMsg);
    }
    else if (cmd === 93101) {
      bdy.forEach((chat) => {
        const { osType } = JSON.parse(chat.extras);
        db.insertChat({ channelId: live.channel.channelId, userId: chat.uid, osType });
      })
    }
  });
}
