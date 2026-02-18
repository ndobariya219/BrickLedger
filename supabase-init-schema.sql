-- User settings for storing score weight preferences per user
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  score_weights jsonb not null default '{"growth":1,"roi":1,"cashflow":1,"pl":1}',
  updated_at timestamptz not null default now()
);

alter table public.user_settings owner to postgres;

-- Row Level Security
alter table public.user_settings enable row level security;

-- Policies: only the owning user can read/write their settings
create policy if not exists "User can select own settings"
  on public.user_settings
  for select
  using (auth.uid() = user_id);

create policy if not exists "User can upsert own settings"
  on public.user_settings
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "User can update own settings"
  on public.user_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- Account Ownership Table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_ownership') THEN
    CREATE TABLE public.account_ownership (
      id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
      account_id integer NOT NULL,
      entity_id integer NOT NULL,
      percentage numeric NOT NULL CHECK (percentage > 0::numeric AND percentage <= 100::numeric),
      CONSTRAINT account_ownership_pkey PRIMARY KEY (id),
      CONSTRAINT account_ownership_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
      CONSTRAINT account_ownership_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id)
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_ownership') THEN
    ALTER TABLE public.account_ownership ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
-- Allow users to select/insert/update/delete their own account_ownership rows
CREATE POLICY "AccountOwnership: Select own" ON public.account_ownership
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );
CREATE POLICY "AccountOwnership: Insert own" ON public.account_ownership
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );
CREATE POLICY "AccountOwnership: Update own" ON public.account_ownership
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );
CREATE POLICY "AccountOwnership: Delete own" ON public.account_ownership
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );

-- Accounts Table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
    CREATE TABLE public.accounts (
      id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      user_id uuid,
      type text NOT NULL,
      balance numeric DEFAULT 0,
      currency text DEFAULT 'AUD'::text,
      interest_rate double precision,
      start_date timestamp with time zone,
      end_date timestamp with time zone,
      offset_account_id bigint,
      property_id integer,
      institution text,
      createdat timestamp with time zone DEFAULT now(),
      updatedat timestamp with time zone DEFAULT now(),
      CONSTRAINT accounts_pkey PRIMARY KEY (id),
      CONSTRAINT accounts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
      CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts') THEN
    ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
-- Allow users to select/insert/update/delete their own accounts
CREATE POLICY "Accounts: Select own" ON public.accounts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Accounts: Insert own" ON public.accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Accounts: Update own" ON public.accounts
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Accounts: Delete own" ON public.accounts
  FOR DELETE USING (user_id = auth.uid());

-- Entities Table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'entities') THEN
    CREATE TABLE public.entities (
      id integer NOT NULL DEFAULT nextval('entities_id_seq'::regclass),
      user_id uuid,
      name text NOT NULL,
      type text NOT NULL CHECK (type = ANY (ARRAY['individual'::text, 'trust'::text, 'company'::text])),
      created_at timestamp with time zone DEFAULT now(),
      CONSTRAINT entities_pkey PRIMARY KEY (id),
      CONSTRAINT entities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'entities') THEN
    ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
-- Allow users to select/insert/update/delete their own entities
CREATE POLICY "Entities: Select own" ON public.entities
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Entities: Insert own" ON public.entities
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Entities: Update own" ON public.entities
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Entities: Delete own" ON public.entities
  FOR DELETE USING (user_id = auth.uid());

-- Properties Table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
    CREATE TABLE public.properties (
      id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      user_id uuid,
      address text NOT NULL,
      propertytype text NOT NULL,
      propertycategory text NOT NULL,
      purchasedate timestamp with time zone NOT NULL,
      purchaseprice double precision NOT NULL,
      currentvalue double precision NOT NULL,
      createdat timestamp with time zone DEFAULT now(),
      updatedat timestamp with time zone DEFAULT now(),
      CONSTRAINT properties_pkey PRIMARY KEY (id),
      CONSTRAINT properties_new_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'properties') THEN
    ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
-- Allow users to select/insert/update/delete their own properties
CREATE POLICY "Properties: Select own" ON public.properties
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Properties: Insert own" ON public.properties
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Properties: Update own" ON public.properties
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Properties: Delete own" ON public.properties
  FOR DELETE USING (user_id = auth.uid());

-- Property Ownership Table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_ownership') THEN
    CREATE TABLE public.property_ownership (
      id integer NOT NULL DEFAULT nextval('ownership_id_seq'::regclass),
      user_id uuid,
      entity_id integer,
      property_id bigint,
      percentage numeric NOT NULL CHECK (percentage > 0::numeric AND percentage <= 100::numeric),
      CONSTRAINT property_ownership_pkey PRIMARY KEY (id),
      CONSTRAINT ownership_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
      CONSTRAINT ownership_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
      CONSTRAINT ownership_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id)
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_ownership') THEN
    ALTER TABLE public.property_ownership ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Transactions Table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    CREATE TABLE public.transactions (
      id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      user_id uuid,
      propertyid bigint,
      entity_id integer,
      date timestamp with time zone NOT NULL,
      description text NOT NULL,
      amount double precision NOT NULL,
      type text NOT NULL,
      category text,
      CONSTRAINT transactions_pkey PRIMARY KEY (id),
      CONSTRAINT transactions_new_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
      CONSTRAINT transactions_propertyid_fkey FOREIGN KEY (propertyid) REFERENCES public.properties(id),
      CONSTRAINT transactions_new_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id),
      CONSTRAINT transactions_new_propertyid_fkey FOREIGN KEY (propertyid) REFERENCES public.properties(id)
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions') THEN
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Property Depreciation per Financial Year (simple model)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_depreciation_fy') THEN
    CREATE TABLE public.property_depreciation_fy (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      property_id bigint NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
      fy_start_year integer NOT NULL, -- e.g., 2024 for FY24-25
      amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT property_depreciation_fy_unique UNIQUE (user_id, property_id, fy_start_year)
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_depreciation_fy') THEN
    ALTER TABLE public.property_depreciation_fy ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
-- Policies: user can CRUD only their own FY depreciation rows
CREATE POLICY "DepFY: Select own" ON public.property_depreciation_fy
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "DepFY: Insert own" ON public.property_depreciation_fy
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "DepFY: Update own" ON public.property_depreciation_fy
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "DepFY: Delete own" ON public.property_depreciation_fy
  FOR DELETE USING (user_id = auth.uid());