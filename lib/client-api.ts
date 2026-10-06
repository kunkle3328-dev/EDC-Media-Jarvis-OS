'use client';

/**
 * Native XMLHttpRequest transport for local /api/jarvis/* endpoints.
 *
 * Why XMLHttpRequest instead of window.fetch?
 * In the AI Studio preview iframe, /_aistudio-iframe.js wraps window.fetch and
 * awaits `bootstrapChannel` before checking whether a request URL is external or
 * local. When warmup.html reloads the iframe internally via window.location.reload(),
 * `bootstrapChannel` can remain unresolved, causing window.fetch('/api/...') to
 * hang indefinitely. XMLHttpRequest is untouched by /_aistudio-iframe.js and
 * dispatches directly to the local Next.js server with zero delay.
 */

export interface JarvisHttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export function jarvisJsonRequest<T = Record<string, unknown>>(
  url: string,
  options: JarvisHttpOptions = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = options.method || 'GET';
    xhr.open(method, url, true);
    xhr.timeout = options.timeoutMs ?? 45000;

    xhr.setRequestHeader('Accept', 'application/json');
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        if (v !== undefined) {
          xhr.setRequestHeader(k, v);
        }
      }
    }

    xhr.onload = () => {
      const raw = xhr.responseText || '{}';
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { error: raw };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed as T);
      } else {
        const maybeError =
          parsed && typeof parsed === 'object' && 'error' in parsed
            ? (parsed as { error?: unknown }).error
            : undefined;
        const errMsg: string =
          typeof maybeError === 'string' && maybeError.length > 0
            ? maybeError
            : `HTTP ${xhr.status}`;
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Network request failed for ${url}`));
    };

    xhr.ontimeout = () => {
      reject(new Error(`Request timed out for ${url}`));
    };

    xhr.send(options.body ?? null);
  });
}

export function jarvisNdjsonStreamRequest(
  url: string,
  payload: Record<string, unknown>,
  onEvent: (evt: Record<string, unknown>) => Promise<void> | void,
  headers?: Record<string, string>
): Promise<{
  isNdjson: boolean;
  jsonFallback?: Record<string, unknown>;
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.timeout = 60000;
    xhr.setRequestHeader('Content-Type', 'application/json');

    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (v !== undefined) {
          xhr.setRequestHeader(k, v);
        }
      }
    }

    let processedIndex = 0;
    let lineBuffer = '';
    let eventQueue: Promise<void> = Promise.resolve();

    const enqueueLine = (rawLine: string) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        eventQueue = eventQueue
          .then(() => onEvent(parsed))
          .catch((err) => {
            console.warn('NDJSON stream event handler warning:', err);
          });
      } catch {
        // Ignore partial or non-JSON line
      }
    };

    const flushAvailableText = (isFinal: boolean) => {
      const currentText = xhr.responseText || '';
      if (currentText.length > processedIndex) {
        const delta = currentText.slice(processedIndex);
        processedIndex = currentText.length;
        lineBuffer += delta;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';
        for (const line of lines) {
          enqueueLine(line);
        }
      }
      if (isFinal && lineBuffer.trim()) {
        const remaining = lineBuffer;
        lineBuffer = '';
        enqueueLine(remaining);
      }
    };

    xhr.onprogress = () => {
      const contentType = (
        xhr.getResponseHeader('content-type') || ''
      ).toLowerCase();
      if (contentType.includes('application/x-ndjson')) {
        flushAvailableText(false);
      }
    };

    xhr.onload = async () => {
      const contentType = (
        xhr.getResponseHeader('content-type') || ''
      ).toLowerCase();

      if (xhr.status < 200 || xhr.status >= 300) {
        let errMsg = `Turn request failed (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText || '{}');
          if (parsed.error) errMsg = parsed.error;
        } catch {
          // ignore
        }
        reject(new Error(errMsg));
        return;
      }

      if (contentType.includes('application/x-ndjson')) {
        flushAvailableText(true);
        await eventQueue;
        resolve({ isNdjson: true });
        return;
      }

      try {
        const json = JSON.parse(xhr.responseText || '{}') as Record<
          string,
          unknown
        >;
        resolve({ isNdjson: false, jsonFallback: json });
      } catch (err) {
        reject(
          err instanceof Error
            ? err
            : new Error('Invalid JSON response from server')
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Network error calling ${url}`));
    };

    xhr.ontimeout = () => {
      reject(new Error(`Request timed out calling ${url}`));
    };

    xhr.send(JSON.stringify(payload));
  });
}
