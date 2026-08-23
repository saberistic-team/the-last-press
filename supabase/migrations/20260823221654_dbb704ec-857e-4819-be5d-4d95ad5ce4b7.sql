REVOKE ALL ON FUNCTION public.refill_allowance(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refill_allowance(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.duration_buckets() FROM public, anon;