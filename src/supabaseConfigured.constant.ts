const url = import.meta.env.SUPABASE_URL
const publishableKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(url && publishableKey)
