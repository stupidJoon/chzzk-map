const pool = require('./db.js');
const getChats = require('./websocket.js');

const getLives = (next) => {
  const url = (next) ?
    `https://api.chzzk.naver.com/service/v1/lives?size=50&sortType=POPULAR&concurrentUserCount=${next.concurrentUserCount}&liveId=${next.liveId}` :
    'https://api.chzzk.naver.com/service/v1/lives?size=50&sortType=POPULAR'
  return fetch(url, { headers: { 'User-Agent': 'Mozilla' } })
    .then((res) => res.json())
    .then((json) => json.content);
}
const getAvailableLives = async (minUser) => {
  const availableLives = [];
  let next;

  while (true) {
    const content = await getLives(next);
    const lives = content.data;
    const filteredLives = lives.filter((live) => live.concurrentUserCount >= minUser);
    availableLives.push(...filteredLives);
    next = content.page.next;

    if (filteredLives.length < lives.length) break;
  }

  return availableLives;
}

const getLiveDetail = (channelId) => fetch(
  `https://api.chzzk.naver.com/service/v3/channels/${channelId}/live-detail`,
  { headers: { 'User-Agent': 'Mozilla' } })
  .then((res) => res.json())
  .then((json) => json.content);

const getChannel = (channelId) => fetch(
  `https://api.chzzk.naver.com/service/v1/channels/${channelId}`,
  { headers: { 'User-Agent': 'Mozilla' } })
  .then((res) => res.json())
  .then((json) => json.content);


const scrapingChannels = new Set();

async function findChannels() {
  let lives = await getAvailableLives(1000);
  lives = lives.filter((live) => live.adult === false);

  for (const live of lives) {
    const channelId = live.channel.channelId;

    if (scrapingChannels.has(channelId)) continue;
    scrapingChannels.add(channelId);

    const liveDetail = await getLiveDetail(channelId);
    const { channel, chatChannelId } = liveDetail;
    const { followerCount, channelImageUrl } = await getChannel(channelId);

    await pool.query(
      `INSERT INTO channel (id, name, follower, image)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=?, follower=?, image=?`,
      [channelId, channel.channelName, followerCount, channelImageUrl, channel.channelName, followerCount, channelImageUrl],
    );

    console.log(`${channelId} channel start scraping`);
    console.log(new Date(Date.now() + 9 * 60 * 60 * 1000), 'current scraping channels', scrapingChannels);

    getChats(channelId, chatChannelId, async (e) => {
      scrapingChannels.delete(channelId);

      console.log(`${channelId} channel stop scraping`, e);
      console.log(new Date(Date.now() + 9 * 60 * 60 * 1000), 'current scraping channels', scrapingChannels);

      // 현재 수집중인 채널이 없으면 pool을 닫아서 node 프로세스를 종료
      // if (scrapingChannels.size === 0) {
      //   await pool.end();
      // }
    });
  }
}

module.exports = findChannels;
