-- Add unique constraint on conversation_id in mind_maps
-- This is required for upsert (ON CONFLICT) to work correctly.
alter table public.mind_maps
    add constraint mind_maps_conversation_id_key unique (conversation_id);
