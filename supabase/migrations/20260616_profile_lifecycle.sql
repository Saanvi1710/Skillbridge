-- 2026-06-16 Profile lifecycle migration
-- Adds archive flag and delete RLS policy

-- Soft-delete column on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Allow users to hard-delete their own profiles
-- (DROP IF EXISTS first to avoid duplicate policy error on re-run)
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid()::text = user_id::text);
