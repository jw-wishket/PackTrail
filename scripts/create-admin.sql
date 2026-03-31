INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@packtrial.com',
  crypt('admin123!', gen_salt('bf')),
  NOW(),
  '{"name": "관리자"}'::jsonb,
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000001', 'admin@packtrial.com', '관리자', 'ADMIN', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';
