import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import type { AiProviderRecord } from './ai-provider.repository';
import type { AiToolCandidateDto } from './dto/generate-tools.dto';
import { SECRET_REPO } from '../database/database.tokens';
import type { ISecretRepository } from '../secrets/secret.repository';

export interface AiToolSuggestion {
  name: string;
  description?: string;
  method: string;
  path: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

interface ChatRequest {
  system: string;
  user: string;
}

const OPENAI_COMPATIBLE = new Set(['openai', 'groq', 'mistral', 'cohere', 'custom']);

function trimSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function providerKey(provider: string) {
  if (provider === 'azure') return 'azure-openai';
  if (provider === 'gemini') return 'google';
  return provider;
}

function defaultBaseUrl(provider: string) {
  switch (providerKey(provider)) {
    case 'openai': return 'https://api.openai.com/v1';
    case 'anthropic': return 'https://api.anthropic.com/v1';
    case 'google': return 'https://generativelanguage.googleapis.com/v1beta';
    case 'mistral': return 'https://api.mistral.ai/v1';
    case 'groq': return 'https://api.groq.com/openai/v1';
    case 'cohere': return 'https://api.cohere.ai/compatibility/v1';
    case 'ollama': return 'http://localhost:11434';
    default: return '';
  }
}

function extractJsonObject(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new BadRequestException('The AI provider did not return JSON.');
    return JSON.parse(match[0]);
  }
}

function parseToolSuggestions(text: string, fallbackTools: AiToolCandidateDto[]): AiToolSuggestion[] {
  const parsed = extractJsonObject(text);
  const tools = Array.isArray(parsed.tools) ? parsed.tools : [];
  if (!tools.length) throw new BadRequestException('The AI provider returned no tool suggestions.');

  return tools.map((tool, index) => {
    const item = tool as Record<string, unknown>;
    const fallback = fallbackTools[index] ?? fallbackTools[0];
    return {
      name: String(item.name ?? fallback?.name ?? `tool_${index + 1}`),
      description: item.description ? String(item.description) : fallback?.description,
      method: String(item.method ?? fallback?.method ?? 'GET').toUpperCase(),
      path: String(item.path ?? fallback?.path ?? '/'),
      inputSchema: typeof item.inputSchema === 'object' && item.inputSchema !== null ? item.inputSchema as Record<string, unknown> : undefined,
      outputSchema: typeof item.outputSchema === 'object' && item.outputSchema !== null ? item.outputSchema as Record<string, unknown> : undefined,
    };
  });
}

@Injectable()
export class AiProviderExecutorService {
  constructor(@Inject(SECRET_REPO) private readonly secretRepo: ISecretRepository) {}

  async test(provider: AiProviderRecord): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const started = Date.now();
    const response = await this.chat(provider, {
      system: 'Reply with exactly: ok',
      user: 'Connection test. Reply with exactly: ok',
    }, 64);
    return {
      ok: response.toLowerCase().includes('ok'),
      message: response.slice(0, 160),
      latencyMs: Date.now() - started,
    };
  }

  async generateTools(provider: AiProviderRecord, input: {
    serverName?: string;
    baseUrl?: string;
    description?: string;
    tools: AiToolCandidateDto[];
  }): Promise<AiToolSuggestion[]> {
    if (!input.tools.length) throw new BadRequestException('At least one tool candidate is required.');

    const response = await this.chat(provider, {
      system: [
        'You improve MCP tool definitions for an imported API.',
        'Return only JSON with this shape: {"tools":[{"name":"snake_case_name","description":"concise user-facing description","method":"GET","path":"/path","inputSchema":{},"outputSchema":{}}]}.',
        'Preserve each tool method and path. Do not invent endpoints. Keep names lowercase snake_case.',
      ].join(' '),
      user: JSON.stringify({
        serverName: input.serverName,
        baseUrl: input.baseUrl,
        description: input.description,
        tools: input.tools,
      }),
    }, 2400);

    return parseToolSuggestions(response, input.tools);
  }

  private async chat(provider: AiProviderRecord, request: ChatRequest, maxTokens: number): Promise<string> {
    if (!provider.isActive) throw new BadRequestException('AI provider is inactive.');

    const key = providerKey(provider.provider);
    if (OPENAI_COMPATIBLE.has(key)) return this.openAiCompatible(provider, request, maxTokens);
    if (key === 'anthropic') return this.anthropic(provider, request, maxTokens);
    if (key === 'google') return this.google(provider, request, maxTokens);
    if (key === 'azure-openai') return this.azureOpenAi(provider, request, maxTokens);
    if (key === 'ollama') return this.ollama(provider, request, maxTokens);

    throw new BadRequestException(`Unsupported AI provider: ${provider.provider}`);
  }

  private async openAiCompatible(provider: AiProviderRecord, request: ChatRequest, maxTokens: number): Promise<string> {
    const baseUrl = trimSlash(provider.baseUrl || defaultBaseUrl(provider.provider));
    const apiKey = await this.resolveApiKey(provider);
    const { data } = await axios.post(`${baseUrl}/chat/completions`, {
      model: provider.model,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
    }, {
      timeout: 30000,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return data?.choices?.[0]?.message?.content ?? '';
  }

  private async anthropic(provider: AiProviderRecord, request: ChatRequest, maxTokens: number): Promise<string> {
    const baseUrl = trimSlash(provider.baseUrl || defaultBaseUrl(provider.provider));
    const apiKey = await this.resolveApiKey(provider);
    const { data } = await axios.post(`${baseUrl}/messages`, {
      model: provider.model,
      system: request.system,
      messages: [{ role: 'user', content: request.user }],
      max_tokens: maxTokens,
      temperature: 0.2,
    }, {
      timeout: 30000,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    return Array.isArray(data?.content) ? data.content.map((part: any) => part.text ?? '').join('') : '';
  }

  private async google(provider: AiProviderRecord, request: ChatRequest, maxTokens: number): Promise<string> {
    const baseUrl = trimSlash(provider.baseUrl || defaultBaseUrl(provider.provider));
    const apiKey = await this.resolveApiKey(provider);
    const { data } = await axios.post(`${baseUrl}/models/${provider.model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
    }, { timeout: 30000 });
    return data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('') ?? '';
  }

  private async azureOpenAi(provider: AiProviderRecord, request: ChatRequest, maxTokens: number): Promise<string> {
    if (!provider.baseUrl) throw new BadRequestException('Azure OpenAI requires a deployment base URL.');
    const apiKey = await this.resolveApiKey(provider);
    const separator = provider.baseUrl.includes('?') ? '&' : '?';
    const { data } = await axios.post(`${provider.baseUrl}${separator}api-version=2024-02-15-preview`, {
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
    }, {
      timeout: 30000,
      headers: { 'api-key': apiKey },
    });
    return data?.choices?.[0]?.message?.content ?? '';
  }

  private async ollama(provider: AiProviderRecord, request: ChatRequest, maxTokens: number): Promise<string> {
    const baseUrl = trimSlash(provider.baseUrl || defaultBaseUrl(provider.provider));
    const { data } = await axios.post(`${baseUrl}/api/chat`, {
      model: provider.model,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      options: { temperature: 0.2, num_predict: maxTokens },
      stream: false,
    }, { timeout: 30000 });
    return data?.message?.content ?? '';
  }

  private async resolveApiKey(provider: AiProviderRecord): Promise<string> {
    if (providerKey(provider.provider) === 'ollama' && !provider.apiKey) return '';
    const match = provider.apiKey.match(/^\{\{secret:([^}]+)\}\}$/);
    if (!match) throw new BadRequestException('AI provider API key must reference a Secret.');
    const secret = await this.secretRepo.findByName(match[1], provider.ownerId);
    if (!secret) throw new NotFoundException(`Secret "${match[1]}" not found.`);
    return secret.value;
  }
}
