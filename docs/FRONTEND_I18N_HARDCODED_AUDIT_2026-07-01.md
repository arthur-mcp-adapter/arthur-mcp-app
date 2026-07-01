# Frontend i18n Hardcoded Terms Audit

Date: 2026-07-01
Scope: frontend source under `src/` (excluding `src/locales/`, tests, and specs)

## Goal

Identify user-visible hardcoded terms that were not migrated to i18n yet, and organize remediation by impact.

## Method

Heuristic scan over TSX files using text-node and UI-attribute patterns:

- JSX text nodes with literal English text
- Literal UI attributes (`label`, `title`, `placeholder`, `helperText`, `aria-label`, `alt`)
- Manual review of top files to separate real UX copy from technical placeholders

Commands used (summary):

- `grep -RInP ... '>\\s*[A-Za-z][^<{]*<' src`
- `grep -RInP ... '(label|title|placeholder|helperText|aria-label|alt)=\"...\"' src`
- `grep ... | cut -d: -f1 | sort | uniq -c | sort -nr`

## Quantitative Summary

- JSX literal text-node matches: 127
- Literal UI attribute matches: 118
- High-visibility UX keyword occurrences (quick impact sample): 162

Important:

- These are detection matches, not exact debt totals.
- Some literals are acceptable technical examples (for example: `https://api.example.com`, `param_name`, protocol names, brand names).
- The findings below focus on user-facing copy that should be translated.

## Hotspots By File

Top files by concentration of potential hardcoded UI strings:

1. `src/pages/NewServer/index.tsx` (26 text-node matches, 48 UI-attribute matches)
2. `src/features/server/connect/McpEndpointBar/index.tsx` (12 text-node matches, 3 UI-attribute matches)
3. `src/features/server/api-endpoints/ToolAccordion/index.tsx` (12 text-node matches, 5 UI-attribute matches)
4. `src/features/server/api-endpoints/EndpointAccordion/index.tsx` (11 text-node matches, 3 UI-attribute matches)
5. `src/features/server/prompts/PromptsTab/index.tsx` (10 text-node matches, 4 UI-attribute matches)
6. `src/pages/ErrorTracking/index.tsx` (9 text-node matches, 4 UI-attribute matches)
7. `src/features/server/settings/BaseUrlPanel/index.tsx` (9 text-node matches, 6 UI-attribute matches)

## Confirmed Hardcoded UX Terms (Representative)

### 1) New Server flow

File: `src/pages/NewServer/index.tsx`

Examples found:

- Section labels and helper texts:
  - `GraphQL endpoint`
  - `Schema source`
  - `Service address`
  - `Protocol Buffer definition`
  - `Database connection`
  - `MongoDB connection`
  - `Redis connection`
  - `DynamoDB connection`
  - `Elasticsearch connection`
  - `Snowflake connection`
  - `Firestore connection`
- Auth UI literals:
  - `Authentication type`
  - `Header name`
  - `Send as`
  - `Header HTTP`
  - `Username`
  - `Token URL`
  - `Client ID`
  - `Header`
  - `Value`
  - `Toggle visibility`
  - `Remove`
- CTA/status literals:
  - `Upload SDL schema`
  - `Upload .proto file`
  - `Optional — can be added later`

Impact: High (onboarding/setup path is heavily user-facing).

### 2) Server Connect panel

File: `src/features/server/connect/McpEndpointBar/index.tsx`

Examples found:

- `Connection URL`
- `Share with client`
- `Public documentation slug`
- `Share slug`
- `Saving...`
- `Save slug`
- `Could not save share slug.`
- `Copy URL`
- `Copied!`
- `Scan to open on a mobile device`
- `Download QR code`
- `Could not generate the share link. Please try again.`
- `Close`
- `Copy link`

Impact: High (core share/connect flow exposed to end users).

### 3) API Endpoints modules

Files:

- `src/features/server/api-endpoints/EndpointAccordion/index.tsx`
- `src/features/server/api-endpoints/ToolAccordion/index.tsx`
- `src/features/server/api-endpoints/FromEndpointPickerDialog/index.tsx`
- `src/features/server/api-endpoints/ReimportSpecDialog/index.tsx`
- `src/features/server/api-endpoints/ToolCommentsSection/index.tsx`

Examples found:

- Table headers and status terms:
  - `Parameters`, `Name`, `In`, `Type`, `Required`, `Description`
  - `yes`, `no`, `configured`, `none`
- Execution/test actions:
  - `Try it out`, `Try`, `Cancel`, `Execute`, `Executing…`
  - `Output Schema`, `Use as output schema`, `Saving…`, `Clear`, `Hide`, `View`
- Empty/search states:
  - `No parameters.`
  - `No endpoints defined yet.`
  - `No endpoints match your search.`
  - `No endpoints — upload an OpenAPI spec or click "Add endpoint" to create one manually.`
- Dialog and form literals:
  - `Re-import API spec`
  - `Base URL override`
  - `Leave blank to use the URL declared in the spec`
  - `Delete note`
  - `Add a note…`
  - `Search by path or name…`

Impact: High (tooling authoring experience).

### 4) Prompts in Server Detail

File: `src/features/server/prompts/PromptsTab/index.tsx`

Examples found:

- `Prompts`
- `Prompt library`
- `Add prompt`
- `No prompts added yet. Click Add prompt ...`
- `disabled`
- `Edit / Remove`
- `Add prompt from library`
- `Search prompts…`
- `No prompts in your library yet.`
- `Create one now`
- `No prompts match your search.`
- `All prompts are already added to this server.`
- `Done`
- `ARGUMENTS`
- `CONTENT`
- `To edit the prompt content, go to the Prompt library.`
- `Remove prompt?`
- `Remove from server`
- `Close`

Impact: High (frequent content authoring flow).

### 5) Error Tracking page

File: `src/pages/ErrorTracking/index.tsx`

Examples found:

- Help content and guidance:
  - `Sentry Error Tracking`
  - Explanatory paragraphs describing DSN and Sentry paths
- Connection/status copy:
  - `Sentry`, `Connected`, `Not configured`
  - `Open Sentry →`
  - `OK`, `Failed`, `Connected · {latency}ms`
  - `Connection test failed.`
- Form/action literals:
  - `Leave empty to keep saved DSN`
  - `Hide`, `Show`, `Reveal saved DSN`
  - `Active — forwarding error events to Sentry`
  - `Inactive — error forwarding paused`
  - `Testing…`, `Test connection`, `Saving…`, `Connect Sentry`
  - `Error message`, `Test error from Arthur MCP`
  - `Error`, `Warning`, `Info`, `Debug`
- Danger zone:
  - `Danger zone`
  - `Disconnect Sentry`
  - `Removing…`, `Disconnect`

Impact: Medium-High (admin page, but full UX still visible).

### 6) Base URL settings help panel

File: `src/features/server/settings/BaseUrlPanel/index.tsx`

Examples found:

- `API Base URL` (title/help title)
- Multi-paragraph static help copy
- `ExternalAPI Base URL`
- `Base URL used for all HTTP calls in this server`
- `Save`, `Cancel`, `Edit Base URL`
- `No base URL set`

Impact: Medium (settings panel, recurring interaction).

## Terms Likely Acceptable As Technical Literals

Not all literals should become i18n keys. Keep as-is unless product explicitly wants localization:

- Protocol/format examples: `https://api.example.com`, `mongodb+srv://...`, `param_name`
- Variable/code tokens shown as examples: `X-Api-Key`, `/users/{id}`, `<string>`
- Brand/product identifiers when intentionally unlocalized: `Sentry`, `Arthur MCP`
- Language toggle shortcodes: `EN`, `PT`

## Recommended Remediation Order

1. `src/pages/NewServer/index.tsx`
2. `src/features/server/connect/McpEndpointBar/index.tsx`
3. `src/features/server/api-endpoints/*`
4. `src/features/server/prompts/PromptsTab/index.tsx`
5. `src/pages/ErrorTracking/index.tsx`
6. `src/features/server/settings/BaseUrlPanel/index.tsx`

## Suggested Execution Strategy

1. Create/extend namespace keys first in `src/locales/en/*.json` and `src/locales/pt-BR/*.json`.
2. Replace literals in one feature module at a time to keep PRs reviewable.
3. Prefer existing namespaces already used by each module (`servers`, `serverDetail`, `common`, `settings`, `audit`, etc.).
4. Add a lightweight CI guard to detect new hardcoded JSX text outside allowlisted patterns.

## Audit Conclusion

The i18n migration is partially complete but not yet consistent across the frontend. The highest debt is concentrated in server setup, server-connect/share UX, endpoint authoring dialogs/accordions, and Error Tracking. A focused pass on the six modules above will remove most visible hardcoded terms with the best effort-to-impact ratio.
