const express = require('express');
const CIDRMatcher = require('cidr-matcher');
const pool = require('./db.js');

const CF_RANGES = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];
const cfMatcher = new CIDRMatcher(CF_RANGES);

const nodesQuery = `
  WITH
  valid_chat AS (
      SELECT id, cid, uid
      FROM chat
      WHERE created_at>=NOW() - INTERVAL 7 DAY
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
      WHERE created_at>=NOW() - INTERVAL 7 DAY
  ),
  valid_channel AS (
      SELECT id
      FROM channel c
      WHERE EXISTS (SELECT 1 FROM valid_chat WHERE cid = c.id)
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
  ORDER BY distance DESC
`;

const app = express();
const port = 3000;

app.use((req, res, next) => {
  console.log(cfMatcher.contains(req.ip), req.ip);
  // if (!cfMatcher.contains(req.ip)) {
  //   return res.sendStatus(403);
  // }
  next();
});

app.get('/data', async (req, res) => {
  const [nodes] = await pool.query(nodesQuery);
  const [links] = await pool.query(linksQuery);
  const currentTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
  res.json({ nodes, links, updateTime: currentTime });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
