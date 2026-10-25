BEGIN;

DO $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT id
  INTO owner_id
  FROM auth.users
  WHERE lower(email) = lower('REPLACE_WITH_SUPABASE_LOGIN_EMAIL')
  LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'No Supabase Auth user found. Replace REPLACE_WITH_SUPABASE_LOGIN_EMAIL with the confirmed account email.';
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  SELECT
    id,
    email,
    COALESCE(
      NULLIF(raw_user_meta_data ->> 'display_name', ''),
      NULLIF(raw_user_meta_data ->> 'full_name', ''),
      split_part(email, '@', 1)
    )
  FROM auth.users
  WHERE id = owner_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, display_name)
  VALUES
    (md5('classvault.seed.faculty.Mr. Praveen Kumar Sri')::uuid, 'Mr. Praveen Kumar Sri'),
    (md5('classvault.seed.faculty.Ms. Ishwarya')::uuid, 'Ms. Ishwarya'),
    (md5('classvault.seed.faculty.Mr. M. Sulthan Alavudeen')::uuid, 'Mr. M. Sulthan Alavudeen'),
    (md5('classvault.seed.faculty.Ms. D. Kanaga Durga Devi')::uuid, 'Ms. D. Kanaga Durga Devi'),
    (md5('classvault.seed.faculty.Dr. N. Kalyani')::uuid, 'Dr. N. Kalyani'),
    (md5('classvault.seed.faculty.Mr. S. P. Kirthivasan')::uuid, 'Mr. S. P. Kirthivasan'),
    (md5('classvault.seed.faculty.Dr. A. Devi')::uuid, 'Dr. A. Devi'),
    (md5('classvault.seed.faculty.CDC Staff')::uuid, 'CDC Staff')
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

  INSERT INTO public.groups (
    id,
    name,
    group_type,
    short_code,
    subject_code,
    faculty_name,
    description,
    summary,
    icon_key,
    color_hex
  )
  VALUES
    (
      md5('classvault.seed.group.english')::uuid,
      'English',
      'subject',
      'ENG',
      '23ELGE3',
      'Mr. Praveen Kumar Sri',
      'BCA Subject',
      'BCA Subject',
      'book',
      '#F05D9B'
    ),
    (
      md5('classvault.seed.group.cab')::uuid,
      'Computer Application in Business',
      'subject',
      'CAB',
      '22SCCACAOB2',
      'Ms. Ishwarya',
      'BCA Subject',
      'BCA Subject',
      'laptop',
      '#438BFF'
    ),
    (
      md5('classvault.seed.group.python')::uuid,
      'Programming in Python',
      'subject',
      'PYTHON',
      '22SCCCA3',
      'Mr. M. Sulthan Alavudeen',
      'BCA Subject',
      'BCA Subject',
      'code-slash',
      '#11B89A'
    ),
    (
      md5('classvault.seed.group.python-lab')::uuid,
      'Programming in Python Lab',
      'subject',
      'PYTHON LAB',
      '22SCCCA3P',
      'Mr. M. Sulthan Alavudeen',
      'Lab',
      'Lab',
      'flask',
      '#22A5C7'
    ),
    (
      md5('classvault.seed.group.accountancy')::uuid,
      'Principles of Accountancy',
      'subject',
      'ACC',
      '22SCCACAOB1',
      'Ms. D. Kanaga Durga Devi',
      'BCA Subject',
      'BCA Subject',
      'calculator',
      '#F59E0B'
    ),
    (
      md5('classvault.seed.group.tamil')::uuid,
      'Tamil / Tamizhaga Varalarum Panbadum',
      'subject',
      'TAM',
      '23LCGT3',
      'Dr. N. Kalyani',
      'BCA Subject',
      'BCA Subject',
      'library',
      '#9A5BFF'
    ),
    (
      md5('classvault.seed.group.nme')::uuid,
      'NME – E-Commerce',
      'subject',
      'NME',
      '22SNMEVC1',
      'Mr. S. P. Kirthivasan',
      'BCA Subject',
      'BCA Subject',
      'cart',
      '#EF7445'
    ),
    (
      md5('classvault.seed.group.professional-english')::uuid,
      'Professional English for Physical Science-II',
      'subject',
      'PE',
      '22PELPS2',
      'Dr. A. Devi',
      'BCA Subject',
      'BCA Subject',
      'chatbubbles',
      '#7557FF'
    ),
    (
      md5('classvault.seed.group.cdc')::uuid,
      'CDC',
      'subject',
      'CDC',
      NULL,
      'CDC Staff',
      'CDC',
      'CDC',
      'people',
      '#607D9F'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    group_type = EXCLUDED.group_type,
    short_code = EXCLUDED.short_code,
    subject_code = EXCLUDED.subject_code,
    faculty_name = EXCLUDED.faculty_name,
    description = EXCLUDED.description,
    summary = EXCLUDED.summary,
    icon_key = EXCLUDED.icon_key,
    color_hex = EXCLUDED.color_hex;

  INSERT INTO public.group_members (group_id, user_id, role)
  SELECT id, owner_id, 'student'
  FROM public.groups
  WHERE id IN (
    md5('classvault.seed.group.english')::uuid,
    md5('classvault.seed.group.cab')::uuid,
    md5('classvault.seed.group.python')::uuid,
    md5('classvault.seed.group.python-lab')::uuid,
    md5('classvault.seed.group.accountancy')::uuid,
    md5('classvault.seed.group.tamil')::uuid,
    md5('classvault.seed.group.nme')::uuid,
    md5('classvault.seed.group.professional-english')::uuid,
    md5('classvault.seed.group.cdc')::uuid
  )
  ON CONFLICT (group_id, user_id) DO NOTHING;

  INSERT INTO public.group_members (group_id, user_id, role)
  SELECT
    group_row.id,
    md5('classvault.seed.faculty.' || group_row.faculty_name)::uuid,
    'staff'
  FROM public.groups AS group_row
  WHERE group_row.id IN (
    md5('classvault.seed.group.english')::uuid,
    md5('classvault.seed.group.cab')::uuid,
    md5('classvault.seed.group.python')::uuid,
    md5('classvault.seed.group.python-lab')::uuid,
    md5('classvault.seed.group.accountancy')::uuid,
    md5('classvault.seed.group.tamil')::uuid,
    md5('classvault.seed.group.nme')::uuid,
    md5('classvault.seed.group.professional-english')::uuid,
    md5('classvault.seed.group.cdc')::uuid
  )
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;

COMMIT;
