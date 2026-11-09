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

-- Maquette de chaque projet (générée par le parcours client ou par Server avec l'IA).
create table if not exists public.kaizen_maquettes (
  commande_id uuid primary key references public.kaizen_commandes(id) on delete cascade,
  html text not null check (char_length(html) between 100 and 120000),
  source text not null default 'gabarit',
  updated_at timestamptz not null default now()
);
alter table public.kaizen_maquettes enable row level security;

-- Lien partageable de chaque maquette (adresse difficile à deviner).
alter table public.kaizen_maquettes add column if not exists jeton uuid not null default gen_random_uuid();
create unique index if not exists kaizen_maquettes_jeton on public.kaizen_maquettes (jeton);

-- Achats de pièces d'or (recharge pour demander des modifications de maquette).
create table if not exists public.kaizen_achats_pieces (
  id uuid primary key,
  mollie_id text unique not null,
  pack text not null,
  pieces integer not null check (pieces > 0),
  montant numeric(10, 2) not null check (montant > 0),
  statut text not null default 'open',
  reclame boolean not null default false,
  projet_local text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.kaizen_achats_pieces enable row level security;

-- ============================================================================
-- Portefeuille de pièces d'or, tenu par le serveur (un par compte client).
-- Le navigateur ne peut ni lire ni modifier ces tables : tout passe par les
-- routes serveur et les fonctions ci-dessous (débit atomique, jamais négatif).
-- ============================================================================
create table if not exists public.kaizen_portefeuilles (
  email text primary key,
  solde integer not null default 0 check (solde >= 0),
  updated_at timestamptz not null default now()
);
alter table public.kaizen_portefeuilles enable row level security;

create table if not exists public.kaizen_mouvements_pieces (
  id bigint generated always as identity primary key,
  email text not null,
  montant integer not null,
  motif text not null,
  cle text,
  created_at timestamptz not null default now()
);
-- Une même clé (récompense, achat) ne peut créditer un compte qu'une fois.
create unique index if not exists kaizen_mouvements_cle on public.kaizen_mouvements_pieces (email, cle) where cle is not null;
create index if not exists kaizen_mouvements_email on public.kaizen_mouvements_pieces (email, created_at desc);
alter table public.kaizen_mouvements_pieces enable row level security;

alter table public.kaizen_achats_pieces add column if not exists email text;

-- Crédite un compte. Avec une clé, le crédit n'a lieu qu'une seule fois. Retourne le solde.
create or replace function public.kaizen_crediter(p_email text, p_montant integer, p_motif text, p_cle text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_solde integer;
  v_nb integer;
begin
  if p_montant <= 0 then
    insert into kaizen_portefeuilles (email) values (p_email) on conflict (email) do nothing;
    select solde into v_solde from kaizen_portefeuilles where email = p_email;
    return v_solde;
  end if;
  insert into kaizen_mouvements_pieces (email, montant, motif, cle) values (p_email, p_montant, p_motif, p_cle)
    on conflict do nothing;
  get diagnostics v_nb = row_count;
  if v_nb = 0 then
    select solde into v_solde from kaizen_portefeuilles where email = p_email;
    return coalesce(v_solde, 0);
  end if;
  insert into kaizen_portefeuilles (email, solde) values (p_email, p_montant)
    on conflict (email) do update set solde = kaizen_portefeuilles.solde + excluded.solde, updated_at = now()
    returning solde into v_solde;
  return v_solde;
end $$;

-- Débite un compte seulement si le solde suffit. Retourne le nouveau solde, ou null si insuffisant.
create or replace function public.kaizen_debiter(p_email text, p_montant integer, p_motif text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_solde integer;
begin
  update kaizen_portefeuilles set solde = solde - p_montant, updated_at = now()
    where email = p_email and solde >= p_montant
    returning solde into v_solde;
  if v_solde is null then return null; end if;
  insert into kaizen_mouvements_pieces (email, montant, motif) values (p_email, -p_montant, p_motif);
  return v_solde;
end $$;

revoke all on function public.kaizen_crediter(text, integer, text, text) from public, anon, authenticated;
revoke all on function public.kaizen_debiter(text, integer, text) from public, anon, authenticated;

-- Pièces jointes du client (images de référence, PDF), visibles dans l'Espace Server.
-- Les images sont aussi données à l'IA quand Server améliore la maquette.
create table if not exists public.kaizen_pieces_jointes (
  id bigint generated always as identity primary key,
  commande_id uuid not null references public.kaizen_commandes(id) on delete cascade,
  nom text not null,
  type text not null,
  contenu text not null,
  created_at timestamptz not null default now()
);
create index if not exists kaizen_pieces_jointes_commande on public.kaizen_pieces_jointes (commande_id);
alter table public.kaizen_pieces_jointes enable row level security;

-- Atelier de Server : images générées par l'IA ou importées, servies par /api/images/<id>.
create table if not exists public.kaizen_images (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'image/webp',
  contenu text not null,
  description text not null default '',
  origine text not null default 'ia',
  created_at timestamptz not null default now()
);
alter table public.kaizen_images enable row level security;
