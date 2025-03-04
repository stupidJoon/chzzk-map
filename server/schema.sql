DROP TABLE IF EXISTS channel;
DROP TABLE IF EXISTS chat;
DROP TABLE IF EXISTS scraping_live;

CREATE TABLE channel (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  follower INTEGER NOT NULL,
  image TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE chat (
  id INTEGER PRIMARY KEY,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  os_type TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channel(id),
  UNIQUE (channel_id, user_id)
);
CREATE TABLE scraping_live (
  id INTEGER PRIMARY KEY,
  channel_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channel(id)
);
