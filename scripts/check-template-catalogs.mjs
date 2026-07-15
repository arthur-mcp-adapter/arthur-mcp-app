import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogsRoot = path.join(projectRoot, 'public', 'catalogs')

function fail(message) {
  throw new Error(`Template catalog validation failed: ${message}`)
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail(`${path.relative(projectRoot, filePath)} is not valid JSON: ${error.message}`)
  }
}

function requireString(value, field, id) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${id}.${field} must be a non-empty string`)
}

function validateIndex(kind) {
  const directory = path.join(catalogsRoot, kind)
  const index = readJson(path.join(directory, 'index.json'))
  if (!Number.isInteger(index.version) || index.version < 1) fail(`${kind}/index.json has an invalid version`)
  if (!Array.isArray(index.items) || index.items.length === 0) fail(`${kind}/index.json has no items`)

  const ids = new Set()
  const names = new Set()
  for (const item of index.items) {
    requireString(item.id, 'id', kind)
    requireString(item.name, 'name', item.id)
    requireString(item.tagline, 'tagline', item.id)
    requireString(item.description, 'description', item.id)
    requireString(item.category, 'category', item.id)
    requireString(item.emoji, 'emoji', item.id)
    if (!/^[a-z0-9-]+$/.test(item.id)) fail(`${item.id} is not a safe catalog id`)
    if (ids.has(item.id)) fail(`${kind} contains duplicate id ${item.id}`)
    if (names.has(item.name)) fail(`${kind} contains duplicate name ${item.name}`)
    if (!Array.isArray(item.searchTerms)) fail(`${item.id}.searchTerms must be an array`)
    ids.add(item.id)
    names.add(item.name)
  }

  const detailFiles = fs.readdirSync(directory)
    .filter((file) => file.endsWith('.json') && file !== 'index.json')
    .sort()
  const expectedFiles = [...ids].map((id) => `${id}.json`).sort()
  if (JSON.stringify(detailFiles) !== JSON.stringify(expectedFiles)) {
    fail(`${kind} index/detail file set differs`)
  }

  return { directory, index }
}

function validateApiCatalog() {
  const { directory, index } = validateIndex('api')
  for (const summary of index.items) {
    const detail = readJson(path.join(directory, `${summary.id}.json`))
    for (const field of ['id', 'name', 'tagline', 'description', 'category', 'color', 'emoji']) {
      if (detail[field] !== summary[field]) fail(`${summary.id}.${field} differs between index and detail`)
    }
    if (!/^https?:\/\//.test(detail.baseUrl)) fail(`${summary.id}.baseUrl must be an HTTP URL`)
    if (!['none', 'bearer', 'api-key', 'basic'].includes(detail.auth?.type)) fail(`${summary.id}.auth.type is invalid`)
    if (summary.authType !== detail.auth.type) fail(`${summary.id}.authType differs from detail`)
    if (!Array.isArray(detail.tools) || detail.tools.length === 0) fail(`${summary.id}.tools must not be empty`)
    if (summary.toolCount !== detail.tools.length) fail(`${summary.id}.toolCount differs from detail`)
    if ((summary.docsUrl ?? undefined) !== (detail.docsUrl ?? undefined)) fail(`${summary.id}.docsUrl differs from detail`)
    const expectedSearchTerms = detail.tools.flatMap((tool) => [tool.name, tool.description])
    if (JSON.stringify(summary.searchTerms) !== JSON.stringify(expectedSearchTerms)) fail(`${summary.id}.searchTerms is stale`)

    for (const tool of detail.tools) {
      requireString(tool.name, 'tool.name', summary.id)
      requireString(tool.description, 'tool.description', summary.id)
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(tool.method)) fail(`${summary.id}.${tool.name}.method is invalid`)
      if (typeof tool.path !== 'string' || !tool.path.startsWith('/')) fail(`${summary.id}.${tool.name}.path is invalid`)
      if (!Array.isArray(tool.params)) fail(`${summary.id}.${tool.name}.params must be an array`)
    }
  }
  return index.items.length
}

function validatePromptCatalog() {
  const { directory, index } = validateIndex('prompts')
  for (const summary of index.items) {
    const detail = readJson(path.join(directory, `${summary.id}.json`))
    for (const field of ['id', 'name', 'tagline', 'description', 'category', 'emoji']) {
      if (detail[field] !== summary[field]) fail(`${summary.id}.${field} differs between index and detail`)
    }
    if (!Array.isArray(detail.tags) || detail.tags.length === 0) fail(`${summary.id}.tags must not be empty`)
    if (JSON.stringify(summary.tags) !== JSON.stringify(detail.tags)) fail(`${summary.id}.tags differs from detail`)
    if (JSON.stringify(summary.searchTerms) !== JSON.stringify(detail.tags)) fail(`${summary.id}.searchTerms is stale`)
    requireString(detail.content, 'content', summary.id)
    if (!detail.content.includes('{{') || !detail.content.includes('}}')) fail(`${summary.id}.content has no template variable`)
  }
  return index.items.length
}

const apiCount = validateApiCatalog()
const promptCount = validatePromptCatalog()
console.log(`Template catalogs valid: ${apiCount} API templates and ${promptCount} prompt templates.`)
