import * as db from './db.js';
import WebSocket from 'ws';

index();
async function index() {
  let lives = await getLives(process.env.MIN_LIVE_USER);

  lives.forEach((live) => {
    getChats(live);
  });
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
async function getLives(minUser) {
  let lives = await fetchLivesPages(minUser);

  lives = lives.filter((live) => live.adult === false);

  for (const live of lives) {
    const [{ chatChannelId }, { followerCount }] = await Promise.all([
      fetchLiveDetail(live.channel.channelId),
      fetchChannel(live.channel.channelId),
      sleep(100),
    ]);
    live.chatChannelId = chatChannelId;
    live.channel.followerCount = followerCount;
  }

  lives.forEach((live) => db.insertChannel(live.channel));

  const scrapingLives = db.selectScrapingLives();
  lives = lives.filter((live) => scrapingLives.every((scrapingLive) => scrapingLive.channelId !== live.channel.channelId));

  console.log('lives:', lives.length);

  return lives;
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
  "cmd":10000
}
`;
function getChats(live) {
  console.log('chat opened!', live);

  db.insertScrapingLives(live)
  const ws = new WebSocket('wss://kr-ss1.chat.naver.com/chat');

  ws.on('error', console.log);

  ws.on('close', () => {
    console.log('chat closed!', live);
    db.deleteScrapingLives(live);
  });
  
  ws.on('open', () => ws.send(getInitMsg(live.chatChannelId,)));

  ws.on('message', (data) => {
    console.log(JSON.parse(data.toString('utf8')));
    const { cmd, bdy } = JSON.parse(data.toString('utf8'));

    if (cmd === 0) {
      ws.send(pingMsg);
    }
    else if (cmd === 93101) {
      bdy.forEach((chat) => {
        const { osType } = JSON.parse(chat.extras);
        db.insertChat({ channelId: live.channel.channelId, userId: chat.uid, osType });
      })
    }
  });
}
