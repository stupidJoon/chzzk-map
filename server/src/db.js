import Database from 'better-sqlite3';

const db = new Database('./sqlite.db');
db.pragma('journal_mode = WAL');
init();

function init() {
  // DROP TABLE IF EXISTS chat;
  // DROP TABLE IF EXISTS channel;
  const sql = `
  CREATE TABLE IF NOT EXISTS channel (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    follower INTEGER NOT NULL,
    image TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS chat (
    id INTEGER PRIMARY KEY,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    msg TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channel(id)
  );
  `
  db.exec(sql);
}

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
    INSERT INTO chat (channel_id, user_id)
    VALUES (?, ?)
    ON CONFLICT(channel_id, user_id)
    DO UPDATE SET updated_at=CURRENT_TIMESTAMP
  `;
  db.prepare(sql).run(chat.channelId, chat.userId);
}

const insertChatsStmt = db.prepare('INSERT INTO chat (channel_id, user_id, msg) VALUES (?, ?, ?)');
export const insertChats = db.transaction((live, chats) => chats.forEach((chat) => {
  insertChatsStmt.run(live.channel.channelId, chat.uid, chat.msg);
}));
