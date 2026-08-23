CREATE OR REPLACE FUNCTION public.duration_buckets()
RETURNS bigint[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY[3600000, 10800000, 21600000, 43200000, 86400000,
               259200000, 604800000, 1209600000, 2592000000]::bigint[]
$$;

CREATE OR REPLACE FUNCTION public.next_duration_ms(_current bigint, _choice text)
RETURNS bigint LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE b bigint[] := public.duration_buckets(); i int := 1; best int := 1; step int;
BEGIN
  FOR i IN 1..array_length(b,1) LOOP
    IF abs(b[i] - _current) < abs(b[best] - _current) THEN best := i; END IF;
  END LOOP;
  step := CASE WHEN _choice = 'double' THEN 1 WHEN _choice = 'half' THEN -1 ELSE 0 END;
  best := LEAST(array_length(b,1), GREATEST(1, best + step));
  RETURN b[best];
END $$;

ALTER TABLE public.seasons ALTER COLUMN duration_ms SET DEFAULT 86400000;

UPDATE public.seasons SET duration_ms = 86400000 WHERE status = 'pending';