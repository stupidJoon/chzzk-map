import Cloudflare from "cloudflare";
import * as db from './db.js';

index();
async function index() {
  const client = new Cloudflare({
    apiEmail: process.env.CF_API_EMAIL,
    apiKey: process.env.CF_API_KEY,
  });

  const nodes = db.selectNodes();
  const links = db.selectLinks();
  const updateTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

  const value = await client.kv.namespaces.values.update(
    process.env.CF_KV_NAMESPACE,
    process.env.CF_KV_KEY,
    {
      account_id: process.env.CF_ACCOUNT_ID,
      updateTime, nodes, links,
    }
  );
  console.log(updateTime, value, nodes);
}
