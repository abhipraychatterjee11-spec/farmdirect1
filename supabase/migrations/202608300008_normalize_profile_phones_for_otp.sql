begin;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where phone is not null
      and regexp_replace(btrim(phone), '[[:space:]()-]', '', 'g') !~ '^(\+91|91)?[6-9][0-9]{9}$'
  ) then
    raise exception 'Cannot normalize profiles.phone: correct malformed or empty phone values before applying this migration.';
  end if;

  if exists (
    select 1
    from (
      select case
        when normalized_phone ~ '^[6-9][0-9]{9}$' then '+91' || normalized_phone
        when normalized_phone ~ '^91[6-9][0-9]{9}$' then '+' || normalized_phone
        else normalized_phone
      end as e164_phone
      from (
        select regexp_replace(btrim(phone), '[[:space:]()-]', '', 'g') as normalized_phone
        from public.profiles
        where phone is not null
      ) normalized
    ) phones
    group by e164_phone
    having count(*) > 1
  ) then
    raise exception 'Cannot add unique mobile numbers: resolve duplicate profiles.phone values before applying this migration.';
  end if;
end;
$$;

update public.profiles
set phone = case
  when normalized_phone ~ '^[6-9][0-9]{9}$' then '+91' || normalized_phone
  when normalized_phone ~ '^91[6-9][0-9]{9}$' then '+' || normalized_phone
  else normalized_phone
end
from (
  select id, regexp_replace(btrim(phone), '[[:space:]()-]', '', 'g') as normalized_phone
  from public.profiles
  where phone is not null
) normalized
where profiles.id = normalized.id
  and profiles.phone is distinct from case
    when normalized.normalized_phone ~ '^[6-9][0-9]{9}$' then '+91' || normalized.normalized_phone
    when normalized.normalized_phone ~ '^91[6-9][0-9]{9}$' then '+' || normalized.normalized_phone
    else normalized.normalized_phone
  end;

create unique index profiles_phone_unique_not_null on public.profiles (phone) where phone is not null;

commit;
