begin;

revoke execute on function public.get_evaluation_session(uuid) from authenticated;
revoke execute on function public.complete_evaluation(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, timestamptz, integer, jsonb, numeric) from authenticated;

commit;
