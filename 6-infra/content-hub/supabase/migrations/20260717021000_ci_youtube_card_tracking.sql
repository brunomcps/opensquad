begin;

do $migration$
declare
  v_signature regprocedure;
  v_definition text;
  v_old_scope constant text := '(''description'', ''pinned_comment'', ''comment_reply'')';
  v_new_scope constant text := '(''description'', ''pinned_comment'', ''comment_reply'', ''video'')';
begin
  foreach v_signature in array array[
    'public.ci_tracking_series(timestamptz,timestamptz,text,text,text,text)'::regprocedure,
    'public.ci_tracking_events(timestamptz,timestamptz,text,text,text,boolean,boolean,timestamptz,text,integer)'::regprocedure
  ] loop
    select pg_get_functiondef(v_signature) into v_definition;
    if position(v_new_scope in v_definition) > 0 then
      continue;
    end if;
    if position(v_old_scope in v_definition) = 0 then
      raise exception 'unexpected tracking function definition for %', v_signature;
    end if;
    execute replace(v_definition, v_old_scope, v_new_scope);
  end loop;
end;
$migration$;

commit;
