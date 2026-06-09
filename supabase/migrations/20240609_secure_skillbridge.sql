-- 2024-06-09 Secure SkillBridge migration
-- Enable RLS on core tables and create profile_shares table

-- Users table (already exists, ensure RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Profiles table (already exists, ensure RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profile shares table – public slug for sharing
CREATE TABLE IF NOT EXISTS public.profile_shares (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slug text NOT NULL UNIQUE,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.profile_shares ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "users_insert" ON public.users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Policies for profiles table
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Policies for profile_shares (public read via slug)
CREATE POLICY "profile_shares_select_public" ON public.profile_shares
    FOR SELECT USING (true);
CREATE POLICY "profile_shares_insert_own" ON public.profile_shares
    FOR INSERT WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = profile_id));
CREATE POLICY "profile_shares_update_own" ON public.profile_shares
    FOR UPDATE USING (auth.uid()::text = (SELECT user_id::text FROM public.profiles WHERE id = profile_id));

-- Ensure all tables have default timestamps update trigger (optional)

-- Drop any existing default policies that may conflict
DROP POLICY IF EXISTS "public" ON public.users;
DROP POLICY IF EXISTS "public" ON public.profiles;
DROP POLICY IF EXISTS "public" ON public.profile_shares;
