-- Close legacy direct client writes to care_events after append_care_event hardening.
-- Durable care-event appends must flow through public.append_care_event.

drop policy if exists care_events_insert_permitted on public.care_events;

revoke insert, update, delete on table public.care_events from anon;
revoke insert, update, delete on table public.care_events from authenticated;

grant select on table public.care_events to authenticated;
