insert into public.service_types (id, name, description, base_rate_cents, icon, sort_order, is_active)
values
  ('event-security', 'Event Security', 'Crowd control, gate management, and floor visibility.', 26000, 'EV', 1, true),
  ('vip-protection', 'VIP Protection', 'Close protection for executives, talent, and private clients.', 42000, 'VP', 2, true),
  ('residential-guarding', 'Residential Guarding', 'Residential and estate guard coverage.', 22000, 'RG', 3, true),
  ('retail-loss-prevention', 'Retail Loss Prevention', 'Retail loss prevention and visible deterrence.', 24000, 'RL', 4, true),
  ('armed-response', 'Armed Response', 'High-risk response and urgent dispatch cover.', 48000, 'AR', 5, true)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  base_rate_cents = excluded.base_rate_cents,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
