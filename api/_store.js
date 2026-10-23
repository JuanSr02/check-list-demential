// Almacenamiento: Upstash Redis en Vercel; memoria cuando corre local sin Redis.
// (Los archivos que empiezan con "_" dentro de /api no se publican como endpoints.)
import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const mem = new Map();
const memory = {
  async get(k) { return mem.has(k) ? structuredClone(mem.get(k)) : null; },
  async mget(...ks) { return ks.map((k) => (mem.has(k) ? structuredClone(mem.get(k)) : null)); },
  async set(k, v) { mem.set(k, structuredClone(v)); return 'OK'; }
};

export const hasRedis = !!(url && token);
export const store = hasRedis ? new Redis({ url, token }) : memory;
