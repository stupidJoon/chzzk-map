import 'dotenv/config';
import { Agent, interceptors, setGlobalDispatcher } from 'undici'
import cron from 'node-cron';
import { listenChannels } from './chat.js';
import { uploadKv } from './upload.js';

cron.schedule('30 * * * *', async () => {
  await listenChannels(100);
}, {
  // 안쓰면 다음에러남
  // [2026-08-13T10:30:02.059Z] [PID: 1] [NODE-CRON] [WARN] missed execution at Thu Aug 13 2026 10:30:00 GMT+0000 (Coordinated Universal Time)! Possible blocking IO or high CPU user at the same process used by node-cron.
  missedExecutionTolerance: 5000,
});

cron.schedule('0 * * * *', async () => {
  await uploadKv();
}, {
  // [2026-08-14T06:00:02.007Z] [PID: 1] [NODE-CRON] [WARN] missed execution at Fri Aug 14 2026 06:00:00 GMT+0000 (Coordinated Universal Time)! Possible blocking IO or high CPU user at the same process used by node-cron.
  missedExecutionTolerance: 5000,
});

const agent = new Agent();
const dispatcher = agent.compose(interceptors.retry());
setGlobalDispatcher(dispatcher);
