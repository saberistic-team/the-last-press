
CREATE OR REPLACE FUNCTION public.bot_press()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b uuid;
BEGIN
  SELECT p.id INTO b FROM public.profiles p
   WHERE p.is_bot AND NOT p.banned AND p.presses_remaining > 0
   ORDER BY random() LIMIT 1;
  IF b IS NULL THEN
    UPDATE public.profiles SET presses_remaining = 5 WHERE is_bot AND presses_remaining <= 0;
    SELECT p.id INTO b FROM public.profiles p WHERE p.is_bot ORDER BY random() LIMIT 1;
  END IF;
  RETURN public.press_button(b);
END; $$;

REVOKE ALL ON FUNCTION public.bot_press() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bot_press() TO service_role;

-- Simulated crowd behaviour: bots get nervous as the clock runs out.
CREATE OR REPLACE FUNCTION public.crowd_tick()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.seasons%ROWTYPE; frac numeric; pressed boolean := false;
BEGIN
  PERFORM public.settle_seasons();
  SELECT * INTO s FROM public.seasons WHERE status = 'active' LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('pressed', false); END IF;
  frac := GREATEST(0, EXTRACT(EPOCH FROM (s.timer_expires_at - now())) * 1000) / GREATEST(1, s.duration_ms);
  IF frac < 0.05 AND random() < 0.8 THEN
    PERFORM public.bot_press(); pressed := true;
  ELSIF frac < 0.25 AND random() < 0.35 THEN
    PERFORM public.bot_press(); pressed := true;
  ELSIF random() < 0.08 THEN
    PERFORM public.bot_press(); pressed := true;
  END IF;
  RETURN jsonb_build_object('pressed', pressed);
END; $$;

REVOKE ALL ON FUNCTION public.crowd_tick() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crowd_tick() TO service_role;
