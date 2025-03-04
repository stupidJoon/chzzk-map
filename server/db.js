import Database from 'better-sqlite3';

const db = new Database('sqlite.db');
db.pragma('journal_mode = WAL');

export function insertChannel(channel) {
  const sql = `
    INSERT INTO channel (id, name, follower, image)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id)
    DO UPDATE SET name=?, follower=?, image=?, updated_at=CURRENT_TIMESTAMP
  `;
  db.prepare(sql).run(
    channel.channelId, channel.channelName, channel.followerCount, channel.channelImageUrl,
    channel.channelName, channel.followerCount, channel.channelImageUrl,
  );
}

export function insertChat(chat) {
  const sql = `
    INSERT INTO chat (channel_id, user_id, os_type)
    VALUES (?, ?, ?)
    ON CONFLICT(channel_id, user_id)
    DO UPDATE SET os_type=?, updated_at=CURRENT_TIMESTAMP
  `
  db.prepare(sql).run(chat.channelId, chat.userId, chat.osType, chat.osType);
}

export function selectScrapingLives() {
  const sql = `SELECT channel_id FROM scraping_live`;
  return db.prepare(sql).all().map((row) => ({ channelId: row.channel_id }));
}

export function insertScrapingLives(live) {
  const sql = `INSERT INTO scraping_live (channel_id, chat_id) VALUES (?, ?)`;
  db.prepare(sql).run(live.channel.channelId, live.chatChannelId);
}

export function deleteScrapingLives(live) {
  const sql = `DELETE FROM scraping_live WHERE channel_id=?`;
  db.prepare(sql).run(live.channel.channelId);
}
