-- KaizenServer : tables de l'espace client (à exécuter dans Supabase > SQL Editor).
-- Toutes les lectures/écritures passent par les routes serveur (clé service) :
-- la sécurité au niveau des lignes est activée SANS politique, donc aucun accès
-- direct depuis le navigateur.

create table if not exists public.kaizen_commandes (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  email text not null,
  nom text,
  telephone text,
  entreprise text,
  formule text,
  statut text not null default 'nouvelle',
  projet jsonb,
  recap jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists kaizen_commandes_email on public.kaizen_commandes (lower(email));

create table if not exists public.kaizen_messages (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.kaizen_commandes(id) on delete cascade,
  auteur text not null check (auteur in ('client', 'equipe')),
  type text not null default 'message' check (type in ('message', 'conseil')),
  contenu text not null check (char_length(contenu) between 1 and 4000),
  lu boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists kaizen_messages_commande on public.kaizen_messages (commande_id, created_at);

create table if not exists public.kaizen_devis (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.kaizen_commandes(id) on delete cascade,
  montant numeric(12, 2) not null check (montant > 0),
  delai_semaines integer check (delai_semaines > 0),
  details text,
  statut text not null default 'envoye' check (statut in ('envoye', 'accepte', 'refuse')),
  created_at timestamptz not null default now(),
  repondu_at timestamptz
);
create index if not exists kaizen_devis_commande on public.kaizen_devis (commande_id);

alter table public.kaizen_commandes enable row level security;
alter table public.kaizen_messages enable row level security;
alter table public.kaizen_devis enable row level security;

-- Mise à jour d'une base existante (ajout des conseils du maître du jeu) :
alter table public.kaizen_messages add column if not exists type text not null default 'message';

-- Paiement en ligne (Mollie) : part de l'offre à régler en ligne, et suivi des paiements.
alter table public.kaizen_devis add column if not exists acompte_pct integer not null default 0 check (acompte_pct between 0 and 100);

create table if not exists public.kaizen_paiements (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.kaizen_commandes(id) on delete cascade,
  devis_id uuid not null references public.kaizen_devis(id) on delete cascade,
  mollie_id text unique not null,
  montant numeric(12, 2) not null check (montant > 0),
  statut text not null default 'open',
  checkout_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists kaizen_paiements_devis on public.kaizen_paiements (devis_id);
alter table public.kaizen_paiements enable row level security;

-- Projets créés à la main par Server (hors site) et liens de chaque projet.
alter table public.kaizen_commandes add column if not exists source text not null default 'site';

create table if not exists public.kaizen_liens (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.kaizen_commandes(id) on delete cascade,
  titre text not null check (char_length(titre) between 1 and 80),
  url text not null check (url ~ '^https?://'),
  visible_client boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists kaizen_liens_commande on public.kaizen_liens (commande_id);
alter table public.kaizen_liens enable row level security;
