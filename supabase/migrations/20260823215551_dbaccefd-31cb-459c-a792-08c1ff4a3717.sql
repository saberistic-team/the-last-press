
-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  is_member boolean NOT NULL DEFAULT false,
  is_bot boolean NOT NULL DEFAULT false,
  banned boolean NOT NULL DEFAULT false,
  presses_remaining integer NOT NULL DEFAULT 1,
  allowance_month date NOT NULL DEFAULT date_trunc('month', now())::date,
  first_season integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_username_idx ON public.profiles (lower(username));
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ seasons ============
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number integer NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  duration_ms bigint NOT NULL DEFAULT 300000,
  timer_expires_at timestamptz,
  last_press_at timestamptz,
  last_presser_id uuid,
  winner_user_id uuid,
  next_duration_choice text,
  starting_presses integer NOT NULL DEFAULT 10,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_presses integer NOT NULL DEFAULT 0,
  closest_press_ms bigint,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seasons_status_idx ON public.seasons (status);
GRANT SELECT ON public.seasons TO anon, authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons are public" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "admins manage seasons" ON public.seasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ season_players ============
CREATE TABLE public.season_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  presses_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  final_position integer,
  joined_at timestamptz NOT NULL DEFAULT now(),
  eliminated_at timestamptz,
  UNIQUE (season_id, user_id)
);
CREATE INDEX season_players_season_idx ON public.season_players (season_id);
CREATE INDEX season_players_user_idx ON public.season_players (user_id);
GRANT SELECT ON public.season_players TO anon, authenticated;
GRANT ALL ON public.season_players TO service_role;
ALTER TABLE public.season_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season players are public" ON public.season_players FOR SELECT USING (true);
CREATE POLICY "admins manage season players" ON public.season_players FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ presses ============
CREATE TABLE public.presses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username text NOT NULL,
  pressed_at timestamptz NOT NULL DEFAULT now(),
  previous_timer_remaining_ms bigint NOT NULL DEFAULT 0,
  new_expiration_at timestamptz NOT NULL
);
CREATE INDEX presses_season_time_idx ON public.presses (season_id, pressed_at DESC);
CREATE INDEX presses_user_idx ON public.presses (user_id);
GRANT SELECT ON public.presses TO anon, authenticated;
GRANT ALL ON public.presses TO service_role;
ALTER TABLE public.presses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presses are public" ON public.presses FOR SELECT USING (true);

-- ============ notifications ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mark own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ subscriptions ============
CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ duration ladder ============
CREATE OR REPLACE FUNCTION public.next_duration_ms(_current bigint, _choice text)
RETURNS bigint LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT LEAST(604800000::bigint, GREATEST(300000::bigint,
    CASE WHEN _choice = 'double' THEN _current * 2
         WHEN _choice = 'half'   THEN _current / 2
         ELSE _current END))
$$;

-- ============ monthly allowance ============
CREATE OR REPLACE FUNCTION public.refill_allowance(_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles%ROWTYPE; m date := date_trunc('month', now())::date;
BEGIN
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
END; $$;

-- ============ settle expired season ============
CREATE OR REPLACE FUNCTION public.settle_seasons()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.seasons%ROWTYPE; nxt integer;
BEGIN
  SELECT * INTO s FROM public.seasons WHERE status = 'active' FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN jsonb_build_object('settled', false); END IF;
  IF s.timer_expires_at IS NULL OR s.timer_expires_at > now() THEN
    RETURN jsonb_build_object('settled', false);
  END IF;

  UPDATE public.seasons
    SET status = 'ended', ended_at = now(), winner_user_id = s.last_presser_id
    WHERE id = s.id;

  UPDATE public.season_players sp
    SET final_position = 1, status = 'winner'
    WHERE sp.season_id = s.id AND sp.user_id = s.last_presser_id;

  SELECT COALESCE(MAX(season_number),0) + 1 INTO nxt FROM public.seasons;
  INSERT INTO public.seasons (season_number, status, duration_ms)
  VALUES (nxt, 'pending', s.duration_ms);

  RETURN jsonb_build_object('settled', true, 'season_id', s.id, 'winner', s.last_presser_id);
END; $$;

-- ============ THE PRESS ============
CREATE OR REPLACE FUNCTION public.press_button(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles%ROWTYPE; s public.seasons%ROWTYPE; remaining bigint; new_exp timestamptz;
BEGIN
  IF _user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;

  PERFORM public.refill_allowance(_user_id);
  SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'no_profile'); END IF;
  IF p.banned THEN RETURN jsonb_build_object('ok', false, 'error', 'banned'); END IF;
  IF p.presses_remaining <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'no_presses'); END IF;

  -- rate limit: max 1 press per 2 seconds per user
  IF EXISTS (SELECT 1 FROM public.presses WHERE user_id = _user_id AND pressed_at > now() - interval '2 seconds') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  PERFORM public.settle_seasons();

  SELECT * INTO s FROM public.seasons WHERE status IN ('active','pending')
    ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END, season_number
    LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'no_season'); END IF;

  IF s.status = 'active' AND s.timer_expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'season_over');
  END IF;

  remaining := CASE WHEN s.status = 'active'
      THEN GREATEST(0, EXTRACT(EPOCH FROM (s.timer_expires_at - now())) * 1000)::bigint
      ELSE 0 END;
  new_exp := now() + (s.duration_ms || ' milliseconds')::interval;

  UPDATE public.seasons SET
    status = 'active',
    started_at = COALESCE(started_at, now()),
    timer_expires_at = new_exp,
    last_press_at = now(),
    last_presser_id = _user_id,
    total_presses = total_presses + 1,
    closest_press_ms = CASE
      WHEN s.status='active' AND (closest_press_ms IS NULL OR remaining < closest_press_ms) THEN remaining
      ELSE closest_press_ms END
  WHERE id = s.id;

  UPDATE public.profiles SET presses_remaining = presses_remaining - 1,
    first_season = COALESCE(first_season, s.season_number) WHERE id = _user_id;

  INSERT INTO public.season_players (season_id, user_id, presses_used)
  VALUES (s.id, _user_id, 1)
  ON CONFLICT (season_id, user_id) DO UPDATE SET presses_used = public.season_players.presses_used + 1;

  INSERT INTO public.presses (season_id, user_id, username, previous_timer_remaining_ms, new_expiration_at)
  VALUES (s.id, _user_id, p.username, remaining, new_exp);

  RETURN jsonb_build_object('ok', true, 'season_id', s.id, 'expires_at', new_exp,
    'presses_remaining', p.presses_remaining - 1, 'previous_remaining_ms', remaining,
    'season_started', s.status = 'pending');
END; $$;

REVOKE ALL ON FUNCTION public.press_button(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.press_button(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.settle_seasons() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_seasons() TO service_role;
REVOKE ALL ON FUNCTION public.refill_allowance(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refill_allowance(uuid) TO service_role;

-- ============ realtime ============
ALTER TABLE public.seasons REPLICA IDENTITY FULL;
ALTER TABLE public.presses REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seasons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presses;

-- ============ seed demo data ============
INSERT INTO public.profiles (id, username, is_member, is_bot, presses_remaining, first_season)
SELECT gen_random_uuid(),
       (ARRAY['potato','sarah','internetdad','alex','nightowl','quietstorm','molly','bitrot','deadline','glassjaw','kfive','tinman','oreo','vanta','pixel','hollow','marrow','static','umber','zed'])[1 + (i % 20)] || (i * 7 % 999)::text,
       (i % 3 = 0), true, 1 + (i % 11), 1 + (i % 6)
FROM generate_series(1, 400) AS i;

DO $seed$
DECLARE i integer; sid uuid; w uuid; dur bigint := 300000;
BEGIN
  FOR i IN 1..4 LOOP
    SELECT id INTO w FROM public.profiles WHERE is_bot ORDER BY random() LIMIT 1;
    INSERT INTO public.seasons (season_number, status, duration_ms, started_at, ended_at, winner_user_id,
      last_presser_id, total_presses, closest_press_ms, timer_expires_at)
    VALUES (i, 'ended', dur, now() - ((6-i) || ' days')::interval, now() - ((5-i) || ' days')::interval,
      w, w, 200 + i * 137, 1000 + (i * 613 % 9000), now() - ((5-i) || ' days')::interval)
    RETURNING id INTO sid;

    INSERT INTO public.season_players (season_id, user_id, presses_used, status, final_position)
    SELECT sid, p.id, 1 + (random()*6)::int,
      CASE WHEN p.id = w THEN 'winner' ELSE 'active' END,
      CASE WHEN p.id = w THEN 1 ELSE NULL END
    FROM (SELECT id FROM public.profiles WHERE is_bot ORDER BY random() LIMIT 120) p;

    dur := public.next_duration_ms(dur, CASE WHEN i % 2 = 0 THEN 'double' ELSE 'keep' END);
  END LOOP;

  INSERT INTO public.seasons (season_number, status, duration_ms) VALUES (5, 'pending', 300000);
END $seed$;
