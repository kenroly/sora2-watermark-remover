import { defaultProxies } from './defaultList.js';

// Lưu trạng thái sử dụng proxy trong memory (theo process)
// key: proxy string, value: timestamp (ms) lần start browser gần nhất
const proxyUsage: Record<string, number> = {};

function isInQuietWindow(now: Date): boolean {
  const minute = now.getMinutes();
  // Bỏ qua không dùng proxy từ phút 55 -> 59 và từ phút 0 -> 4
  return minute >= 55 || minute < 5;
}

export function getRandomProxy(): string {
  if (!defaultProxies.length) {
    throw new Error('Không có proxy nào trong defaultProxies');
  }

  const now = new Date();

  if (isInQuietWindow(now)) {
    throw new Error(
      'Đang trong khoảng phút 55 đến phút 5, không sử dụng proxy để tránh limit. Vui lòng đợi qua khung giờ này.'
    );
  }

  const oneHourMs = 60 * 60 * 1000;

  // Lọc các proxy được phép dùng (chưa dùng trong 1h gần nhất)
  const available = defaultProxies.filter((proxy) => {
    const last = proxyUsage[proxy];
    if (!last) return true;
    return now.getTime() - last >= oneHourMs;
  });

  if (!available.length) {
    throw new Error('Không có proxy nào khả dụng (mỗi proxy chỉ được dùng 1 lần mỗi giờ).');
  }

  const idx = Math.floor(Math.random() * available.length);
  const proxy = available[idx];

  proxyUsage[proxy] = now.getTime();
  console.log('[proxy] Chọn proxy từ pool sora2:', proxy);

  return proxy;
}

