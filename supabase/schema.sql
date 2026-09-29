-- ==========================================
-- E-VOTING OSIS DATABASE SCHEMA & FUNCTIONS
-- ==========================================

-- 1. Table: candidates
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_number int unique not null,
  name varchar not null,
  vision text not null,
  mission text[] not null,
  photo_url text,
  created_at timestamp with time zone default now()
);

-- 2. Table: voters (User Pemilih)
create table if not exists voters (
  id uuid primary key default gen_random_uuid(),
  username varchar unique not null,
  password_hash text not null,
  raw_password text,
  has_voted boolean default false,
  voted_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Ensure raw_password column exists if table was created previously
alter table voters add column if not exists raw_password text;

-- 3. Table: votes (Anonymized Voting Records - NO voter_id foreign key)
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Enable Realtime for votes table
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table votes;

-- 4. Atomic Voting RPC Function
create or replace function submit_vote_atomic(
  p_voter_id uuid,
  p_candidate_id uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_has_voted boolean;
begin
  -- Check if voter exists and lock row
  select has_voted into v_has_voted
  from voters
  where id = p_voter_id
  for update;

  if not found then
    raise exception 'Voter tidak ditemukan.';
  end if;

  if v_has_voted is true then
    raise exception 'Akun telah digunakan untuk memilih.';
  end if;

  -- 1. Insert vote anonymously (No voter_id record)
  insert into votes (candidate_id, created_at)
  values (p_candidate_id, now());

  -- 2. Update voter voting status
  update voters
  set has_voted = true,
      voted_at = now()
  where id = p_voter_id;

  return true;
end;
$$;

-- 5. Storage Bucket setup for Candidate Photos
insert into storage.buckets (id, name, public) 
values ('candidate-photos', 'candidate-photos', true)
on conflict (id) do nothing;
