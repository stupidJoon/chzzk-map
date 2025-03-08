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
    valid_chat AS (
      SELECT channel_id cid, os_type
      FROM chat c
      WHERE updated_at >= DATETIME('now', '-${process.env.MIN_UPLOADER_DAYS}')
    )
    SELECT
      c.id id, c.name name, c.follower follower, c.image image,
      COUNT(c.id) chat_count, COUNT(CASE WHEN vc.os_type='PC' THEN 1 END) pc_count, COUNT(CASE WHEN vc.os_type='IOS' THEN 1 END) ios_count, COUNT(CASE WHEN vc.os_type='AOS' THEN 1 END) aos_count
    FROM valid_chat vc
    LEFT JOIN channel c ON vc.cid = c.id
    GROUP BY id
    ORDER BY chat_count DESC
    LIMIT ${process.env.MAX_NODES}
    `;
  return db.prepare(sql).all();
}

export function selectLinks() {
  const sql = `
    WITH
    valid_chat AS (
        SELECT channel_id cid, user_id uid
        FROM chat
        WHERE updated_at >= DATETIME('now', '-${process.env.MIN_UPLOADER_DAYS}')
    ),
    valid_channel AS (
        SELECT c.id id, COUNT(c.id) cnt
        FROM valid_chat vc
        LEFT JOIN channel c ON vc.cid = c.id
        GROUP BY id
        ORDER BY cnt DESC
        LIMIT ${process.env.MAX_NODES}
    ),
    channel_pair AS (
        SELECT a.id a_cid, b.id b_cid, a.cnt a_cnt, b.cnt b_cnt
        FROM valid_channel a
        JOIN valid_channel b ON a.id<b.id
    ),
    chat_inter AS (
        SELECT a.cid a_cid, b.cid b_cid, COUNT(*) inter
        FROM valid_chat a
        JOIN valid_chat b ON a.uid=b.uid AND a.cid<b.cid
        GROUP BY a.cid, b.cid
    )
    SELECT p.a_cid source, p.b_cid target, COALESCE(i.inter, 0) inter, COALESCE(i.inter, 0) * 1.0 / MIN(p.a_cnt, p.b_cnt) distance
    FROM channel_pair p
    LEFT JOIN chat_inter i ON i.a_cid=p.a_cid AND i.b_cid=p.b_cid
    ORDER BY distance DESC
  `;
  return db.prepare(sql).all();
}
