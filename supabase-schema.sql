-- جدول نوبت‌ها
create table bookings (
  id uuid primary key default gen_random_uuid(),
  date_key text not null,
  date_display text not null,
  weekday text not null,
  time text not null,
  name text not null,
  phone text not null,
  created_at timestamptz default now()
);

-- جدول تنظیمات (فقط یک ردیف داره)
create table settings (
  id int primary key default 1,
  booking_disabled boolean default false
);
insert into settings (id, booking_disabled) values (1, false);

-- دسترسی عمومی برای خواندن و نوشتن (چون سایت بک‌اند جدا نداره)
alter table bookings enable row level security;
alter table settings enable row level security;

create policy "public read bookings" on bookings for select using (true);
create policy "public insert bookings" on bookings for insert with check (true);
create policy "public delete bookings" on bookings for delete using (true);

create policy "public read settings" on settings for select using (true);
create policy "public update settings" on settings for update using (true);
