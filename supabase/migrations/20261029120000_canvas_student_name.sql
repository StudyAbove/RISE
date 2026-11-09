-- ============================================
-- Greeting Name From Canvas (#56)
-- ============================================

-- Signing up with a magic link doesn't ask for a name, so the Home greeting
-- had no first name to show. The canvas-extension Edge Function (service
-- role) now saves the student's Canvas name to their profile when it's
-- empty, so it needs access to profiles.
grant select, update
on table public.profiles
to service_role;
