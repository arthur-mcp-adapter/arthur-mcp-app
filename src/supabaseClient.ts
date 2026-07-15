import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.SUPABASE_URL
const publishableKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY

// Falls back to a syntactically valid placeholder when unconfigured so createClient() never
// throws at import time (every auth page imports this) — callers gate on supabaseConfigured
// rather than relying on calls against the placeholder failing.
export const supabase = createClient(url || 'http://localhost', publishableKey || 'placeholder')
