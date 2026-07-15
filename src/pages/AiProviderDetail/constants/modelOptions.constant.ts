export const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
  anthropic: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest'],
  google: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  mistral: ['mistral-small-latest', 'mistral-large-latest', 'codestral-latest'],
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  cohere: ['command-r', 'command-r-plus'],
  'azure-openai': ['gpt-4o-mini', 'gpt-4o'],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5'],
  custom: ['gpt-4o-mini', 'llama-3.1-8b-instant'],
}
