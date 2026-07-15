# Frontend Static Template Catalog Plan

## Decision

Store built-in API and prompt templates as static JSON assets. Use one lightweight searchable index per catalog and one detail file per template. Load the index when its gallery is opened and load a full detail only when the user chooses a template.

Do not use `better-sqlite3`, SQLite WASM, IndexedDB, or a backend database for the built-in catalog. The current 159 read-only records do not require database queries, persistence, synchronization, or relational behavior.

This decision follows the requested software engineering direction while preserving the React and architecture constraints documented by `.claude/agents/react-specialist.md`, `.claude/agents/software-engineer.md`, and `.claude/agents/software-architect.md`.

## Problem

The previous frontend stored all catalog data in two large TypeScript constants:

- 69 API templates in a 156,791-byte source module;
- 90 prompt templates in an 85,864-byte source module;
- 242,655 TypeScript source bytes combined.

Both gallery pages imported their entire catalog. API cards needed only presentation/auth/tool-count metadata, while the full nested tool and parameter definitions were needed only after choosing a template. Prompt cards similarly needed metadata and tags, while the full prompt body was needed only after choosing a template.

The existing galleries already had search fields, but they searched only name, tagline, and description.

## Target asset layout

```text
public/catalogs/
├── api/
│   ├── index.json
│   ├── github.json
│   ├── slack.json
│   └── ...
└── prompts/
    ├── index.json
    ├── executive-summary.json
    ├── code-review.json
    └── ...
```

Each `index.json` has a version and ordered `items` array.

The API index contains:

- ID, name, tagline, description, category, color, and emoji;
- authentication type, tool count, and optional documentation URL needed by cards;
- search terms derived from tool names and descriptions.

The prompt index contains:

- ID, name, tagline, description, category, and emoji;
- tags used by cards and search;
- explicit search terms.

Each detail file preserves the complete existing `ApiTemplate` or `PromptTemplate` contract.

## Runtime flow

```text
Gallery route
    -> catalog hook
        -> cached index loader
            -> /catalogs/<kind>/index.json
    -> normalized client-side search over summaries
    -> user chooses a template
        -> cached detail loader
            -> /catalogs/<kind>/<id>.json
        -> existing create drawer
```

Only the active lazy route loads its catalog index. Detail loaders cache promises in memory, deduplicate repeated requests, and remove failed requests from the cache so retry remains possible.

The Servers page loads the compact API index only when at least one server has a `template:` tag. `getProjectIcon` receives summaries instead of importing the removed API constant and retains a generic source fallback while the index is unavailable.

## Search behavior

Search remains client-side because 69 and 90 summaries are small.

Normalization:

- lowercase;
- remove diacritics;
- treat underscores and hyphens as spaces;
- collapse repeated whitespace;
- split the query into tokens;
- require every query token to occur somewhere in the combined searchable fields.

API search fields:

- name;
- tagline;
- description;
- category;
- tool names;
- tool descriptions.

Prompt search fields:

- name;
- tagline;
- description;
- category;
- tags/search terms.

No debounce, fuzzy-search dependency, virtual scrolling, or global state library is needed at the current scale. Search uses memoized filtering in each page.

## React behavior

- Gallery hooks own index loading, error state, retry, and request lifecycle.
- Pages own search text, category, selected detail, and detail-load feedback.
- Cards consume summary contracts and show per-template loading when a detail is requested.
- First index load displays skeleton cards.
- Index failures display a translated error with retry.
- Detail failures preserve the gallery and display a translated non-destructive error.
- Categories are derived from the loaded summaries rather than maintained in separate constants.
- Existing template create/apply behavior remains unchanged.

## Validation

`scripts/check-template-catalogs.mjs` is the catalog integrity gate. It validates:

- valid JSON and positive index versions;
- non-empty indexes;
- unique, filesystem-safe IDs and unique names;
- an exact one-to-one match between index entries and detail files;
- summary/detail metadata parity;
- API URL, authentication, tool, method, path, parameter, count, and search-term invariants;
- prompt tag, content, variable, and search-term invariants.

The gate runs through `npm run check:template-catalogs`, as part of `npm run type-check`, and automatically before `npm run build`.

Unit tests cover normalized token search, safe detail paths, request caching, REST template tags, tool payload construction, and template-derived source visuals.

## File conventions

The `src/features/templates/` boundary follows the frontend organization rules:

- each named module exports one symbol;
- summary/index/state contracts use individual `name.kind.ts` files;
- hooks use `.hook.ts`;
- loaders and search functions use focused `.util.ts` files;
- `index.ts` is the only aggregation module;
- the directory contains `index.ts` and `index.css`.

Static JSON assets are data and do not use TypeScript source-file conventions.

## Permission decision

This change alters storage and loading for existing galleries only. It adds no page, route, backend endpoint, administrative action, or credential surface.

- Existing API-template use remains gated by `templates_use`.
- Existing prompt creation remains gated by `prompts_create`.
- No backend or frontend permission contract changes are required.
- Catalog JSON contains public built-in definitions only and must never contain credentials or secrets.

## Delivery phases

- [x] **Phase 0 — baseline:** record counts, source size, consumers, search behavior, and card/detail field requirements.
- [x] **Phase 1 — static assets:** generate two versioned indexes and 159 individual detail files with exact data parity.
- [x] **Phase 2 — catalog boundary:** add summary contracts, cached fetch loaders, React hooks, and normalized token search.
- [x] **Phase 3 — UI migration:** move both galleries to index search/detail loading and move server visuals to summary metadata.
- [x] **Phase 4 — remove constants:** delete embedded catalog/category constants and obsolete template parameter builders.
- [x] **Phase 5 — validation:** add the build/type-check catalog gate, focused tests, translated failure states, and documentation.

## Acceptance criteria

- The frontend bundle contains no embedded API or prompt catalog constant.
- `/templates` loads only the API index before a template is selected.
- `/prompts/templates` loads only the prompt index before a template is selected.
- Selecting a card loads exactly that detail file and repeated selection uses the memory cache.
- Search includes API operations and prompt tags, is accent-insensitive, and supports multi-token queries.
- All 69 API templates and 90 prompt templates pass automated index/detail validation.
- API creation preserves `source:rest`, `template:<name>`, authentication, tools, and parameters.
- Prompt creation preserves content and tags.
- Loading, retry, detail-error, no-results, and source-icon fallback states are present.
- No backend code, schema, endpoint, or permission contract changes are introduced.
