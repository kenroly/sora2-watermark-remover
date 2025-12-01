import type { Page } from '@playwright/test';
import { runtimeConfig } from '../config.js';
import { sendErrorWithScreenshot } from '../telegram.js';

export interface BrowserRemoveResult {
  mediaUrl: string;
}

export async function removeWatermarkViaBrowser(
  page: Page,
  soraUrl: string,
  taskId?: string
): Promise<BrowserRemoveResult | null> {
  try {
    // Nếu page đã ở đúng URL, chỉ cần refresh (nhanh hơn nhiều)
    const currentUrl = page.url();
    if (currentUrl.includes('socialutils.io/sora-watermark-remover')) {
      console.log('[browser-flow] Page đã ở đúng URL, refresh page...');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    } else {
      console.log('[browser-flow] Điều hướng tới trang Sora Watermark Remover...');
      await page.goto(runtimeConfig.SOCIALUTILS_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000
      });
    }

    // Đợi 5s để trang load hoàn toàn trước khi nhập URL
    console.log('[browser-flow] Đợi 5s để trang load hoàn toàn...');
    await page.waitForTimeout(5_000);

    // Điền URL vào input
    const input = page.locator('#video-input');
    console.log('[browser-flow] Đang click vào input...');
    await input.click({ timeout: 15_000 });
    await input.fill('');
    await input.type(soraUrl, { delay: 20 });

    // Verify input đã được điền đúng
    const inputValue = await input.inputValue();
    console.log('[browser-flow] Đã điền Sora URL vào input:', inputValue);
    
    if (inputValue !== soraUrl) {
      throw new Error(`Input value không khớp! Expected: ${soraUrl}, Got: ${inputValue}`);
    }

    // Click button để submit
    console.log('[browser-flow] Đang click button Remove Watermark...');
    
    // Chuẩn bị chờ response API trước khi click
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/sora/remove-watermark') &&
          res.request().method() === 'POST',
        { timeout: 60_000 }
      ),
      page.click('button.btn')
    ]);

    console.log('[browser-flow] Đã click button và nhận response từ API /sora/remove-watermark');

    const result = (await response.json()) as any;

    if (result?.errorCode == null && typeof result?.mediaUrl === 'string') {
      console.log('[browser-flow] API thành công! Media URL:', result.mediaUrl);
      return { mediaUrl: result.mediaUrl };
    }

    // API trả về lỗi → screenshot và gửi Telegram
    const errorMsg = `API trả về lỗi: ${JSON.stringify(result)}`;
    console.error('[browser-flow]', errorMsg);
    await sendErrorWithScreenshot(page, errorMsg, taskId);
    return null;
  } catch (error: any) {
    // Lỗi khi xử lý (timeout, element not found, etc.) → screenshot và gửi Telegram
    const errorMsg = error?.message || String(error);
    console.error('[browser-flow] Lỗi khi xử lý:', errorMsg);
    await sendErrorWithScreenshot(page, errorMsg, taskId);
    return null;
  }
}


