import fetch from 'node-fetch';
import { runtimeConfig } from './config.js';

export interface TaskData {
  id: string;
  prompt: string;
  image_urls?: string[];
  timing?: number;
  resolution?: string;
  dimension?: string;
  count?: number;
  generate_type?: string;
  // Custom field for this tool: Sora video URL
  video_url?: string;
}

export interface TaskResponse {
  error_code: number;
  message: string;
  data?: TaskData;
}

export class TaskClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = runtimeConfig.API_BASE_URL;
    this.apiKey = runtimeConfig.API_KEY;

    // Debug nhẹ để kiểm tra xem API key có được load từ .env hay không (không in full key)
    if (!this.apiKey) {
      console.warn('[task] API_KEY trống! Kiểm tra lại file .env (API_KEY hoặc TOOL_API_KEY)');
    } else {
      console.log('[task] API_KEY đã load, length =', this.apiKey.length);
    }
  }

  async claimTask(productCode: string): Promise<TaskData | null> {
    const url = `${this.baseUrl}/tasks/${productCode}?api_key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      const data = (await response.json()) as TaskResponse;

      if (data.error_code === 0 && data.data) {
        console.log('[task] Claimed task', { id: data.data.id, productCode });
        return data.data;
      }

      if (data.error_code === 180005) {
        // No pending tasks
        console.log('[task] No pending tasks available for product', productCode);
        return null;
      }

      console.warn('[task] Failed to claim task', {
        error_code: data.error_code,
        message: data.message
      });
      return null;
    } catch (error) {
      console.error('[task] Error claiming task', { error, url });
      return null;
    }
  }

  async completeTask(taskId: string, resultUrl: string): Promise<boolean> {
    const url = `${this.baseUrl}/tasks/${taskId}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ result_url: resultUrl })
      });

      const data = (await response.json()) as TaskResponse;

      if (data.error_code === 0) {
        console.log('[task] Task completed', { taskId, resultUrl });
        return true;
      }

      console.warn('[task] Failed to complete task', {
        taskId,
        error_code: data.error_code,
        message: data.message
      });
      return false;
    } catch (error) {
      console.error('[task] Error completing task', { error, taskId });
      return false;
    }
  }

  async reportTask(taskId: string, reason: string): Promise<boolean> {
    const url = `${this.baseUrl}/tasks/${taskId}/report`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = (await response.json()) as TaskResponse;

      if (data.error_code === 0) {
        console.log('[task] Task reported as failed', { taskId, reason });
        return true;
      }

      console.warn('[task] Failed to report task', {
        taskId,
        error_code: data.error_code,
        message: data.message
      });
      return false;
    } catch (error) {
      console.error('[task] Error reporting task', { error, taskId });
      return false;
    }
  }

  async resetTask(taskId: string): Promise<boolean> {
    const url = `${this.baseUrl}/tasks/${taskId}/reset`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      const data = (await response.json()) as TaskResponse;

      if (data.error_code === 0) {
        console.log('[task] Task reset', { taskId });
        return true;
      }

      console.warn('[task] Failed to reset task', {
        taskId,
        error_code: data.error_code,
        message: data.message
      });
      return false;
    } catch (error) {
      console.error('[task] Error resetting task', { error, taskId });
      return false;
    }
  }
}


