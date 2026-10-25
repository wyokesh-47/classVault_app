ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_self
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY groups_select_members
ON public.groups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_members AS membership
    WHERE membership.group_id = groups.id
      AND membership.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY group_members_select_self
ON public.group_members
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY messages_select_members
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_members AS membership
    WHERE membership.group_id = messages.group_id
      AND membership.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY materials_select_members
ON public.materials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_members AS membership
    WHERE membership.group_id = materials.group_id
      AND membership.user_id = (SELECT auth.uid())
  )
);
