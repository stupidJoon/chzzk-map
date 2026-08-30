import Cloudflare, { toFile } from 'cloudflare';
import { redis } from './redis.js';
import { logger } from './logger.js';

export async function uploadKv() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const channels = await redis.hGetAll('channel');

  const nodes = (await Promise.all(Object.entries(channels).map(async ([channelId, json]) => {
    const key = `chat:${channelId}`;
    await redis.zRemRangeByScore(key, 0, cutoff - 1); // 1970~7일전 삭제(-1은 inclusive해서)
    const chatCount = await redis.zCard(key);
    const channel = JSON.parse(json);
    return {
      id: channelId,
      name: channel.name,
      follower: channel.follower,
      image: channel.image,
      chatCount,
    };
  })))
    .filter((node) => node.chatCount > 0)
    .sort((a, b) => b.chatCount - a.chatCount)
    .slice(0, 150);

  const linkPromises = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const source = nodes[i];
      const target = nodes[j];
      linkPromises.push(redis
        .zInterCard([`chat:${source.id}`, `chat:${target.id}`])
        .then((inter) => ({
          source: source.id,
          target: target.id,
          inter,
          distance: inter / Math.min(source.chatCount, target.chatCount),
        })),
      );
    }
  }
  const links = (await Promise.all(linkPromises)).sort((a, b) => b.distance - a.distance);

  const updateTime = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

  const client = new Cloudflare({ apiToken: process.env.CF_API_TOKEN });
  const response = await client.kv.namespaces.values.update(
    process.env.CF_KV_KEY,
    {
      account_id: process.env.CF_ACCOUNT_ID,
      namespace_id: process.env.CF_KV_NAMESPACE,
      value: await toFile(
        Buffer.from(JSON.stringify({ updateTime, nodes, links })),
        'data.json',
      ),
    },
  );

  logger.info({ updateTime, response, nodes: nodes.length, links: links.length }, 'Uploaded');
}
