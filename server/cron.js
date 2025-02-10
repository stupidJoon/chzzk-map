const fs = require('fs/promises');
const schedule = require('node-schedule');
const pool = require('./db.js');

const CHAT_INTERVAL = '7 DAY';

const nodesQuery = `
  WITH
  valid_chat AS (
      SELECT id, cid, uid
      FROM chat
      WHERE created_at>=NOW() - INTERVAL ${CHAT_INTERVAL}
  )
  SELECT id, name, follower, image
  FROM channel c
  WHERE EXISTS (SELECT 1 FROM valid_chat WHERE cid = c.id)
`;
const linksQuery = `
  WITH
  valid_chat AS (
      SELECT id, cid, uid
      FROM chat
      WHERE created_at>=NOW() - INTERVAL ${CHAT_INTERVAL}
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
  SELECT p.a_cid source, p.b_cid target, IFNULL(i.inter, 0) inter, IFNULL(i.inter, 0) / LEAST(a_cnt.cnt, b_cnt.cnt) distance
  FROM channel_pair p
  LEFT JOIN chat_inter i ON i.a_cid=p.a_cid AND i.b_cid=p.b_cid
  LEFT JOIN chat_count a_cnt ON a_cnt.cid=p.a_cid
  LEFT JOIN chat_count b_cnt ON b_cnt.cid=p.b_cid
`;

schedule.scheduleJob('30 * * * *', () => {
  updateData();
});

async function updateData() {
  const [nodes] = await pool.query(nodesQuery);
  const [links] = await pool.query(linksQuery);
  const updateTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

  await fs.writeFile('data.json', JSON.stringify({ nodes, links, updateTime }), 'utf8');
}
