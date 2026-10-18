-- ============================================
-- Choosing and Coloring Canvas Classes (#22)
-- ============================================

-- Students pick which Canvas classes to sync and a color for each. The color
-- marks that class's assignments across the app.

alter table public.courses
    -- A key from src/theme/courseColors.ts, e.g. 'coral'.
    add column color text
        check (color in (
            'sunbeam', 'apricot', 'coral', 'blush', 'lilac', 'periwinkle',
            'sky', 'aqua', 'mint', 'sage', 'pistachio', 'sand'
        )),

    -- Off when the student chose not to sync this Canvas class.
    add column sync_enabled boolean not null default true;
