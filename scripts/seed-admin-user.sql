-- ==============================================================================
-- Script: seed-admin-user.sql
-- Purpose: Insert or update admin user (elmasry.yt2020@gmail.com) in Supabase
--          auth.users table on the self-hosted PostgreSQL database.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_email text := 'elmasry.yt2020@gmail.com';
  v_password text := 'Gothi2027';
  v_encrypted_pw text;
BEGIN
  v_encrypted_pw := crypt(v_password, gen_salt('bf'));

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    UPDATE auth.users
    SET
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"Dr. Seif Elmasry","specialty":"ENT Specialist"}'::jsonb,
      updated_at = now()
    WHERE email = v_email;
    RAISE NOTICE 'Updated existing user: %', v_email;
  ELSE
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at,
      is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_pw,
      now(),
      NULL,
      '',
      NULL,
      '',
      NULL,
      '',
      '',
      NULL,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Dr. Seif Elmasry","specialty":"ENT Specialist"}'::jsonb,
      FALSE,
      now(),
      now(),
      NULL,
      NULL,
      '',
      '',
      NULL,
      '',
      0,
      NULL,
      '',
      NULL,
      FALSE,
      NULL,
      FALSE
    );

    -- Ensure an identity record exists for email login
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        json_build_object('sub', v_user_id::text, 'email', v_email)::jsonb,
        'email',
        v_email,
        now(),
        now(),
        now()
      );
    END IF;

    RAISE NOTICE 'Created new user: % with ID: %', v_email, v_user_id;
  END IF;
END $$;
