import type { HttpResponse } from './http-client';

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface ResponseMapperConfig {
  enabled: boolean;
  maxResponseLen?: number;
  maxDepth?: number;
  arraySlice?: number;
  errorTruncateLen?: number;
}

const DEFAULT_MAX_LEN = 100000;
const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_ARRAY_SLICE = 20;
const DEFAULT_ERROR_TRUNCATE = 2000;

export function mapResponse(response: HttpResponse, config?: ResponseMapperConfig): McpToolResult {
  const limit = config?.enabled ?? false;

  if (response.status >= 400) {
    const body = limit
      ? truncate(response.body, config?.errorTruncateLen ?? DEFAULT_ERROR_TRUNCATE)
      : response.body;
    return {
      content: [{ type: 'text', text: `HTTP ${response.status} ${response.statusText}\n\n${body}` }],
      isError: true,
    };
  }

  if (response.contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(response.body);
      const text = limit
        ? smartTruncate(parsed, config?.maxResponseLen, config?.maxDepth, config?.arraySlice)
        : JSON.stringify(parsed, null, 2);
      return { content: [{ type: 'text', text }] };
    } catch {
      return {
        content: [{
          type: 'text',
          text: limit ? truncate(response.body, config?.maxResponseLen ?? DEFAULT_MAX_LEN) : response.body,
        }],
      };
    }
  }

  if (response.contentType.includes('text/') || response.contentType.includes('xml')) {
    return {
      content: [{
        type: 'text',
        text: limit ? truncate(response.body, config?.maxResponseLen ?? DEFAULT_MAX_LEN) : response.body,
      }],
    };
  }

  return {
    content: [{ type: 'text', text: `[Binary: ${response.contentType}, ${response.body.length} bytes, HTTP ${response.status}]` }],
  };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n... [truncated], ${text.length - max} characters omitted]`;
}

function smartTruncate(data: unknown, maxLen?: number, maxDepth?: number, arraySlice?: number): string {
  const depth = maxDepth ?? DEFAULT_MAX_DEPTH;
  const slice = arraySlice ?? DEFAULT_ARRAY_SLICE;
  const len = maxLen ?? DEFAULT_MAX_LEN;
  const shrunk = shrinkData(data, depth, slice);
  const text = JSON.stringify(shrunk, null, 2);
  return truncate(text, len);
}

function shrinkData(data: unknown, depth: number, arraySlice: number): unknown {
  if (depth === 0) return typeof data === 'object' && data !== null ? '[...]' : data;
  if (Array.isArray(data)) {
    const sliced = data.slice(0, arraySlice);
    const result = sliced.map((item) => shrinkData(item, depth - 1, arraySlice));
    if (data.length > arraySlice) result.push(`... ${data.length - arraySlice} more items`);
    return result;
  }
  if (data !== null && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    return Object.fromEntries(entries.map(([k, v]) => [k, shrinkData(v, depth - 1, arraySlice)]));
  }
  return data;
}
