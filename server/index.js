const fs = require('fs/promises');
const express = require('express');
const CIDRMatcher = require('cidr-matcher');

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

const app = express();
const port = 3000;

app.use((req, res, next) => {
  console.log(cfMatcher.contains(req.ip), req.ip);
  if (!cfMatcher.contains(req.ip)) {
    return res.sendStatus(403);
  }
  next();
});

app.get('/data', async (req, res) => {
  // const [nodes] = await pool.query(nodesQuery);
  // console.log('nodes')
  // const [links] = await pool.query(linksQuery);
  // console.log('links')
  // const currentTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
  // res.json({ nodes, links, updateTime: currentTime });

  const str = await fs.readFile('data.json', 'utf8');
  const data = JSON.parse(str);
  res.json(data);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
