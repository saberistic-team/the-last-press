-- 1. Realtime for subscriptions
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- 2. Track whether the player picked their own name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_set boolean NOT NULL DEFAULT true;

-- 3. Auto-create a profile for every new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; candidate text; n int := 0;
BEGIN
  base := regexp_replace(split_part(COALESCE(NEW.email, 'player'), '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  IF length(base) < 3 THEN base := 'player'; END IF;
  base := left(base, 16);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate)) LOOP
    n := n + 1;
    candidate := left(base, 14) || n::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, username_set)
  VALUES (NEW.id, candidate, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Lazily expire memberships whose paid period has ended
CREATE OR REPLACE FUNCTION public.expire_membership(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles p SET is_member = false
  WHERE p.id = _user_id AND p.is_member
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND (
          (s.status IN ('active','trialing','past_due')
            AND (s.current_period_end IS NULL OR s.current_period_end > now()))
          OR (s.status = 'canceled' AND s.current_period_end > now())
        )
    );
END $$;

REVOKE ALL ON FUNCTION public.expire_membership(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_membership(uuid) TO service_role;

-- 5. refill_allowance now expires stale memberships first
CREATE OR REPLACE FUNCTION public.refill_allowance(_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles%ROWTYPE; m date := date_trunc('month', now())::date;
BEGIN
  PERFORM public.expire_membership(_user_id);
  SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF p.allowance_month < m THEN
    UPDATE public.profiles
      SET presses_remaining = CASE WHEN p.is_member THEN 11 ELSE 1 END,
          allowance_month = m
      WHERE id = _user_id
      RETURNING presses_remaining INTO p.presses_remaining;
  END IF;
  RETURN p.presses_remaining;
END $$;