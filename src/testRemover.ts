import { launchBrowser } from './browser/launch.js';
import { getRandomProxy } from './proxy/select.js';

const TEST_SHARE_LINK =
  process.argv[2] ??
  'https://sora.chatgpt.com/p/s_691dce18f2e0819189b7e19a67098d67';

async function main() {
  console.log('============================================================');
  console.log('TEST REMOVE SORA WATERMARK VIA removesorawatermark.online');
  console.log('============================================================');
  console.log('[test] Sora share link:', TEST_SHARE_LINK);

  // 1) Load fingerprinted browser với proxy giống worker
  console.log('[test] Đang load browser với fingerprint + proxy...');
  const proxy = getRandomProxy();
  const { context, page } = await launchBrowser({ proxy });

  try {
    // 2) Mở trang removesorawatermark.online và đợi load
    console.log('[test] Điều hướng tới https://www.removesorawatermark.online/ ...');
    await page.goto('https://www.removesorawatermark.online/', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    });
    console.log('[test] Đợi 5s cho trang load hoàn toàn...');
    await page.waitForTimeout(5_000);

    // 3) Điền Sora share link vào input #share-link
    const input = page.locator('#share-link');
    console.log('[test] Click vào input...');
    await input.click({ timeout: 15_000 });
    await input.fill('');
    await input.type(TEST_SHARE_LINK, { delay: 20 });

    const inputValue = await input.inputValue();
    console.log('[test] Giá trị input hiện tại:', inputValue);

    if (inputValue !== TEST_SHARE_LINK) {
      throw new Error(
        `Input value không khớp! Expected: ${TEST_SHARE_LINK}, Got: ${inputValue}`
      );
    }

    // 4) Click nút "Remove Watermark Now" và bắt response API /api/removesora/remove
    console.log('[test] Click nút "Remove Watermark Now" và chờ response API...');

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/removesora/remove') &&
          res.request().method() === 'POST',
        { timeout: 60_000 }
      ),
      page.locator('text=Remove Watermark Now').click()
    ]);

    console.log('[test] Đã nhận response từ /api/removesora/remove');

    const result = (await response.json()) as any;
    console.log('[test] JSON response:', result);

    if (result?.success && typeof result?.resultVideoUrl === 'string') {
      console.log('✅ SUCCESS - resultVideoUrl:', result.resultVideoUrl);
    } else {
      console.log('❌ API trả về lỗi hoặc không có resultVideoUrl');
    }
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error('[test] Lỗi không mong muốn:', err);
  process.exit(1);
});


