#!/usr/bin/env node
import { runtimeConfig } from './config.js';
import { resolve } from 'node:path';
import readline from 'node:readline';
import { promises as fs } from 'node:fs';
import { plugin } from 'playwright-with-fingerprints';
import type { Tag } from 'playwright-with-fingerprints';

const DEFAULT_TAGS: Tag[] = ['Microsoft Windows', 'Chrome'];

async function main() {
  console.log('============================================================');
  console.log('SORA PRO PREMIUM LOGIN HELPER');
  console.log('============================================================');
  console.log('[sora-login] Cookie file:', runtimeConfig.SORA_PRO_COOKIE_FILE);
  console.log(
    '[sora-login] Trang login:',
    runtimeConfig.SORA_PRO_BASE_URL ?? 'https://www.removesorawatermark.pro/en'
  );

  let browser: any = null;
  let page: any = null;

  // Thử load fingerprint để browser trông "hợp lệ" hơn (không dùng persistent profile để tránh lỗi quota)
  try {
    plugin.setWorkingFolder(resolve(runtimeConfig.FINGERPRINT_WORKDIR));
    plugin.setServiceKey(runtimeConfig.BABLOSOFT_API_KEY);
    console.log('[sora-login] Đang lấy fingerprint từ Bablosoft...');
    const fp = await plugin.fetch({ tags: DEFAULT_TAGS });
    if (!fp || fp.trim() === '' || fp === 'undefined') {
      throw new Error('Fingerprint API trả về giá trị không hợp lệ');
    }
    plugin.useFingerprint(fp);
    console.log('[sora-login] Đã áp dụng fingerprint thành công');

    console.log('[sora-login] Đang mở browser với fingerprint (không persistent)...');
    browser = await plugin.launch({ headless: false });
    page = await browser.newPage();
  } catch (err: any) {
    console.error(
      '[sora-login] Lỗi khi dùng fingerprint, không thể mở browser fingerprinted:',
      err?.message || String(err)
    );
  }

  if (!browser || !page) {
    throw new Error(
      'Không thể mở browser với fingerprint. Vui lòng kiểm tra lại cấu hình Bablosoft.'
    );
  }

  await page.goto(runtimeConfig.SORA_PRO_BASE_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000
  });

  console.log('\n[sora-login] ❗ Hãy đăng nhập tài khoản premium trên cửa sổ browser.');
  console.log('[sora-login] Sau khi login xong và kiểm tra OK, quay lại terminal và nhấn Enter để lưu profile & thoát.\n');

  await new Promise<void>((resolvePromise) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Nhấn Enter sau khi đã login xong...', () => {
      rl.close();
      resolvePromise();
    });
  });

  console.log('[sora-login] Đang đọc cookies và lưu ra file...');
  const origin = new URL(runtimeConfig.SORA_PRO_BASE_URL).origin;
  const context = page.context();
  const cookies = await context.cookies(origin);
  const cookieFile = resolve(runtimeConfig.SORA_PRO_COOKIE_FILE);
  await fs.writeFile(cookieFile, JSON.stringify(cookies, null, 2), 'utf8');
  console.log('[sora-login] Đã lưu cookies vào', cookieFile);

  console.log('[sora-login] Đang đóng browser...');
  await browser.close();
  console.log('[sora-login] Hoàn tất. Bạn có thể chạy: npm run sora');
}

main().catch((err) => {
  console.error('[sora-login] Lỗi không mong muốn:', err);
  process.exit(1);
});


