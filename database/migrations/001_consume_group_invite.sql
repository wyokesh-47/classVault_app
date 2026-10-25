CREATE OR REPLACE FUNCTION public.consume_group_invite(
  p_token_hash TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  invite_row public.group_invites%ROWTYPE;
BEGIN
  SELECT *
  INTO invite_row
  FROM public.group_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  IF invite_row.expires_at IS NOT NULL AND invite_row.expires_at <= now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  IF invite_row.max_uses IS NOT NULL AND invite_row.uses_count >= invite_row.max_uses THEN
    RAISE EXCEPTION 'invite_limit_reached';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (invite_row.group_id, p_user_id, 'student')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'already_a_member';
  END IF;

  UPDATE public.group_invites
  SET uses_count = uses_count + 1
  WHERE id = invite_row.id;

  RETURN invite_row.group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_group_invite(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_group_invite(TEXT, UUID) TO service_role;
