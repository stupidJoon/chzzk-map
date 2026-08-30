import { redis } from './redis.js';
import { logger } from './logger.js';

const listeningChannels = new Set();

export async function listenChannels(minUser) {
  const lives = (await fetchLivesPages(minUser))
    .filter((live) => live.adult === false);
  
  for (const live of lives) {
    const { followerCount } = await fetchChannel(live.channel.channelId);
    const { chatChannelId } = await fetchLiveDetail(live.channel.channelId);
    live.chatChannelId = chatChannelId;
    live.channel.followerCount = followerCount;
    await redis.hSet(`channel`, live.channel.channelId, JSON.stringify({
      name: live.channel.channelName,
      follower: live.channel.followerCount,
      image: live.channel.channelImageUrl,
    }));

    if (listeningChannels.has(live.channel.channelId)) continue;
    listeningChannels.add(live.channel.channelId);
    listenChats(live);
  }
}

function listenChats(live) {
  const ws = new WebSocket('wss://kr-ss1.chat.naver.com/chat');

  const interval = setInterval(async () => {
    const { openLive } = await fetchChannel(live.channel.channelId);
    if (!openLive) {
      logger.info({ live }, 'Close WS due to live closed');
      return ws.close();
    }
    if (ws.readyState !== WebSocket.OPEN) {
      logger.info({ live, ws }, 'WS state is not open');
      return;
    }
    ws.send(JSON.stringify(getPingMessage()));
  }, 20_000 +  Math.floor(Math.random() * 5_000));

  ws.addEventListener('error', async (event) => {
    logger.error({
      listeningChannels: [...listeningChannels],
      listeningCnt: listeningChannels.size,
      live,
      // channel: await fetchChannel(live.channel.channelId),
      event: {
        message: event.message,
        error: event.error,
        name: event.error?.name,
        msg: event.error?.message,
        stack: event.error?.stack,
      },
    }, 'onerror');
  });

  ws.addEventListener('open', async () => {
    ws.send(JSON.stringify(getInitMessage(live.chatChannelId)));
    logger.info({
      listeningChannels: [...listeningChannels],
      listeningCnt: listeningChannels.size,
      live,
      // channel: await fetchChannel(live.channel.channelId),
     }, 'onopen');
  });

  ws.addEventListener('close', async (event) => {
    clearInterval(interval);
    listeningChannels.delete(live.channel.channelId);
    logger.info({
      listeningChannels: [...listeningChannels],
      listeningCnt: listeningChannels.size,
      live,
      // channel: await fetchChannel(live.channel.channelId),
      event: { code: event.code, reason: event.reason, wasClean: event.wasClean, type: event.type },
     }, 'onclose');
  });

  ws.addEventListener('message', async (event) => {
    const { cmd, bdy } = JSON.parse(event.data);
    if (cmd === 0) {
      ws.send(JSON.stringify(getPongMessage()));
    }
    else if (cmd === 93101) {
      await redis.zAdd(`chat:${live.channel.channelId}`, bdy.map((chat) => ({
        score: Date.now(),
        value: chat.uid,
      })));
    }
  });
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
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla' } });
  const json = await res.json()
  return json.content;
}

function getInitMessage(cid) {
  return {
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
  };
}
function getPingMessage() {
  return {
    ver: 3,
    cmd: 0,
  };
}
function getPongMessage() {
  return {
    ver: 3,
    cmd: 10000,
  };
}
