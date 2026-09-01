-- 1) Remove SECURITY DEFINER exposure: has_role becomes SECURITY INVOKER.
--    It reads user_roles under RLS ("own roles readable"), which is sufficient for
--    every policy usage (has_role(auth.uid(), ...)). Drop the recursive admin policy
--    on user_roles; role management is performed server-side with the service role.
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 2) Notifications: creation is backend-only.
REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT, DELETE ON public.notifications FROM authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
DROP POLICY IF EXISTS "service role inserts notifications" ON public.notifications;
CREATE POLICY "service role inserts notifications" ON public.notifications
  FOR INSERT TO service_role WITH CHECK (true);

-- 3) Subscriptions: owner-only reads, no anon access, realtime stays RLS-scoped.
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
DROP POLICY IF EXISTS "service role manages subscriptions" ON public.subscriptions;
CREATE POLICY "service role manages subscriptions" ON public.subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;