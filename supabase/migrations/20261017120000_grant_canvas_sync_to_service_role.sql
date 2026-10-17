-- ============================================
-- Canvas Sync: Edge Function Access (#22)
-- ============================================

-- This project doesn't grant new tables to its roles automatically, so the
-- canvas-extension Edge Function (service role) couldn't read the pairing
-- codes or save synced classes.
grant select, insert, update, delete
on table
    public.extension_pairing_codes,
    public.extension_tokens,
    public.canvas_connections,
    public.courses,
    public.assignments
to service_role;
