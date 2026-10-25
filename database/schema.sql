CREATE TYPE public.group_type AS ENUM (
  'subject',
  'class',
  'general'
);

CREATE TYPE public.group_role AS ENUM (
  'student',
  'rep',
  'staff'
);

CREATE TYPE public.material_type AS ENUM (
  'pdf',
  'ppt',
  'youtube',
  'zoom',
  'text'
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_display_name_not_empty CHECK (length(trim(display_name)) > 0)
);

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_type public.group_type NOT NULL,
  short_code TEXT,
  subject_code TEXT,
  faculty_name TEXT,
  description TEXT,
  summary TEXT,
  icon_key TEXT,
  color_hex CHAR(7),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT groups_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT groups_color_hex_format CHECK (
    color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$'
  )
);

CREATE TABLE public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.group_role NOT NULL DEFAULT 'student',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_role public.group_role NOT NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_important BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  preserved_at TIMESTAMPTZ,
  preserved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_not_empty CHECK (length(trim(body)) > 0),
  CONSTRAINT messages_preservation_consistent CHECK (
    (preserved_at IS NULL AND preserved_by IS NULL)
    OR preserved_at IS NOT NULL
  )
);

CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  material_type public.material_type NOT NULL,
  url TEXT NOT NULL,
  retention_label TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT materials_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT materials_url_not_empty CHECK (length(trim(url)) > 0)
);

CREATE TABLE public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT group_invites_token_hash_hex CHECK (token_hash ~ '^[0-9a-fA-F]{64}$'),
  CONSTRAINT group_invites_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT group_invites_uses_count_nonnegative CHECK (uses_count >= 0),
  CONSTRAINT group_invites_uses_within_limit CHECK (max_uses IS NULL OR uses_count <= max_uses)
);

CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER groups_set_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX group_members_user_id_idx ON public.group_members (user_id);
CREATE INDEX messages_group_created_at_idx ON public.messages (group_id, created_at DESC);
CREATE INDEX messages_active_expiry_idx ON public.messages (expires_at)
  WHERE expires_at IS NOT NULL AND preserved_at IS NULL;
CREATE INDEX materials_group_posted_at_idx ON public.materials (group_id, posted_at DESC);
CREATE INDEX group_invites_group_id_idx ON public.group_invites (group_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
