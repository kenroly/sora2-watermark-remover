import { defaultProxies } from './defaultList.js';

// Đơn giản: chọn random 1 proxy từ pool giống sora2.
// (Nếu sau này bạn muốn query từ Mongo như MongoProfileStore thì có thể thay logic ở đây.)

export function getRandomProxy(): string {
  if (!defaultProxies.length) {
    throw new Error('Không có proxy nào trong defaultProxies');
  }
  const idx = Math.floor(Math.random() * defaultProxies.length);
  const proxy = defaultProxies[idx];
  console.log('[proxy] Chọn proxy từ pool sora2:', proxy);
  return proxy;
}


