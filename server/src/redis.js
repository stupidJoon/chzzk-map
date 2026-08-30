import { createClient } from 'redis';

export const redis = await createClient({ url: 'redis://redis:6379' }).connect();
