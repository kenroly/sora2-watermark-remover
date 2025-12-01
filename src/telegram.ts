import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runtimeConfig } from './config.js';
import fetch from 'node-fetch';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export async function sendTelegramMessage(message: string): Promise<void> {
  if (!runtimeConfig.TELEGRAM_BOT_TOKEN || !runtimeConfig.TELEGRAM_CHAT_ID) {
    console.warn('[telegram] Telegram không được cấu hình, bỏ qua gửi message');
    return;
  }

  const url = `${TELEGRAM_API_BASE}${runtimeConfig.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: runtimeConfig.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[telegram] Lỗi khi gửi message:', text);
    } else {
      console.log('[telegram] Đã gửi message qua Telegram');
    }
  } catch (error) {
    console.error('[telegram] Lỗi khi gửi message:', error);
  }
}

export async function sendTelegramPhoto(
  photoPath: string,
  caption?: string
): Promise<void> {
  if (!runtimeConfig.TELEGRAM_BOT_TOKEN || !runtimeConfig.TELEGRAM_CHAT_ID) {
    console.warn('[telegram] Telegram không được cấu hình, bỏ qua gửi photo');
    return;
  }

  const url = `${TELEGRAM_API_BASE}${runtimeConfig.TELEGRAM_BOT_TOKEN}/sendPhoto`;

  try {
    // Dynamic import form-data để tương thích với ES modules
    const FormData = (await import('form-data')).default;
    const photoBuffer = await readFile(photoPath);
    const form = new FormData();
    form.append('chat_id', runtimeConfig.TELEGRAM_CHAT_ID);
    form.append('photo', photoBuffer, {
      filename: 'screenshot.png',
      contentType: 'image/png'
    });
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }

    const response = await fetch(url, {
      method: 'POST',
      body: form,
      // @ts-ignore - form-data headers
      headers: form.getHeaders()
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[telegram] Lỗi khi gửi photo:', text);
    } else {
      console.log('[telegram] Đã gửi screenshot qua Telegram');
    }
  } catch (error) {
    console.error('[telegram] Lỗi khi gửi photo:', error);
  }
}

export async function sendErrorWithScreenshot(
  page: any,
  errorMessage: string,
  taskId?: string
): Promise<void> {
  try {
    // Screenshot
    const screenshotPath = join(process.cwd(), `error-screenshot-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Tạo caption
    const caption = `<b>❌ Lỗi khi xử lý task</b>\n\n` + `<b>Task ID:</b> ${taskId ?? 'N/A'}\n` + `<b>Lỗi:</b> ${errorMessage}\n` + `<b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}`;

    // Gửi screenshot + message
    await sendTelegramPhoto(screenshotPath, caption);

    // Xóa file screenshot sau khi gửi
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(screenshotPath);
    } catch (unlinkError) {
      // Ignore unlink error
    }
  } catch (error) {
    console.error('[telegram] Lỗi khi screenshot và gửi Telegram:', error);
    // Nếu screenshot fail, vẫn gửi message text
    await sendTelegramMessage(
      `<b>❌ Lỗi khi xử lý task</b>\n\n` +
        `<b>Task ID:</b> ${taskId ?? 'N/A'}\n` +
        `<b>Lỗi:</b> ${errorMessage}\n` +
        `<b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n\n` +
        `<i>(Không thể chụp screenshot)</i>`
    );
  }
}

