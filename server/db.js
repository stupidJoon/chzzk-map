import Database from 'better-sqlite3';

const db = new Database(process.env.DB_PATH);
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

export function selectNodes() {
  const sql = `
    WITH
    valid_channel AS (
      SELECT DISTINCT c.channel_id cid
      FROM chat c
      WHERE c.updated_at >= DATETIME('now', '-7 days')
    )
    SELECT c.id id, c.name name, c.follower follower, c.image image
    FROM valid_channel vc
    LEFT JOIN channel c ON vc.cid = c.id
    `;
  return db.prepare(sql).all();
}

export function selectDistances() {
  const sql = `
    WITH
    valid_chat AS (
        SELECT channel_id cid, user_id uid
        FROM chat
        WHERE updated_at >= DATETIME('now', '-7 days')
    ),
    valid_channel AS (
        SELECT DISTINCT c.id id
        FROM channel c
        JOIN valid_chat vc ON c.id=vc.cid
    ),
    channel_pair AS (
        SELECT a.id a_cid, b.id b_cid
        FROM valid_channel a
        JOIN valid_channel b ON a.id<b.id
    ),
    chat_inter AS (
        SELECT a.cid a_cid, b.cid b_cid, COUNT(*) inter
        FROM valid_chat a
        JOIN valid_chat b ON a.uid=b.uid AND a.cid<b.cid
        GROUP BY a.cid, b.cid
    ),
    chat_count AS (
        SELECT cid, COUNT(uid) cnt
        FROM valid_chat
        GROUP BY cid
    )
    SELECT p.a_cid source, p.b_cid target, COALESCE(i.inter, 0) inter, COALESCE(i.inter, 0) * 1.0 / MIN(a_cnt.cnt, b_cnt.cnt) distance
    FROM channel_pair p
    LEFT JOIN chat_inter i ON i.a_cid=p.a_cid AND i.b_cid=p.b_cid
    LEFT JOIN chat_count a_cnt ON a_cnt.cid=p.a_cid
    LEFT JOIN chat_count b_cnt ON b_cnt.cid=p.b_cid
    ORDER BY distance DESC
  `;
  return db.prepare(sql).all();
}
