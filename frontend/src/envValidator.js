export function validateEnv() {
  const required = [
    VITE_API_URL,
    VITE_SUPABASE_URL,
    VITE_SUPABASE_KEY
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    const errorMsg = SkillBridge Startup Error: Missing required environment variables:  + missing.join(, );
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}
