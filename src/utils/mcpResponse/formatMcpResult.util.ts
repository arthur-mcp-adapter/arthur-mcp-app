import { parseMcpResponse } from './parseMcpResponse.util'

export function formatMcpResult(data: unknown) {
  const rpc = parseMcpResponse(data)
  if (rpc?.error) return { text: JSON.stringify(rpc.error, null, 2), isError: true }
  const result = rpc?.result ?? rpc
  const content = result?.content ?? rpc?.content
  const text = result?.messages?.[0]?.content?.text ?? content?.[0]?.text
  if (typeof text === 'string') {
    try { return { text: JSON.stringify(JSON.parse(text), null, 2), isError: !!result?.isError } } catch { return { text, isError: !!result?.isError } }
  }
  return { text: JSON.stringify(result, null, 2), isError: !!result?.isError }
}
