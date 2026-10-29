-- One daily measurement; preserve the deployed scoring logic, privileges and history.
do $daily_measurement$
declare definition text;
begin
 select pg_get_functiondef('public.shapes_cognitive_action(uuid,text,jsonb)'::regprocedure) into definition;
 if position('if used>=3 then' in definition)>0 then
  definition=replace(definition,
   'if used>=3 then raise exception ''Hai usato i 3 tentativi di oggi''',
   'if used>=1 then raise exception ''Domani potrai effettuare di nuovo il test.''');
 elsif position('if used>=1 then' in definition)=0 then
  raise exception 'Unexpected daily limit: review the deployed function before updating';
 end if;
 definition=replace(definition,'''used'',used,''day'',today,','''used'',used,''day'',today,''timezone'',tz,');
 execute definition;
end $daily_measurement$;
