-- BrightPath per-school timezone, Kenya-first / Africa-ready, 2026-11-10
-- Additive migration. Existing school settings remain in Africa/Nairobi until changed.
-- All schedule/verified event functions now derive the calendar date from school settings.
-- Apply all statements atomically after reviewing the current server definitions.

ALTER TABLE public.bp_school_settings ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'KE';

ALTER TABLE public.bp_school_settings ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'Africa/Nairobi';

CREATE OR REPLACE FUNCTION bright_private.school_time_zone(p_school uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO pg_catalog, public
 AS $$
 SELECT COALESCE((SELECT NULLIF(s.time_zone,'') FROM public.bp_school_settings s
                  WHERE s.school_id=p_school LIMIT 1),'Africa/Nairobi')
 $$;

CREATE OR REPLACE FUNCTION bright_private.validate_school_region()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO pg_catalog, public
 AS $$
 BEGIN
  IF NEW.country_code IS NULL OR NEW.country_code !~ '^[A-Z]{2}$' THEN
   RAISE EXCEPTION 'Use a valid two-letter country code';
  END IF;
  IF NEW.time_zone IS NULL OR length(NEW.time_zone)>100
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names z WHERE z.name=NEW.time_zone) THEN
   RAISE EXCEPTION 'Use a recognized IANA timezone such as Africa/Nairobi or Africa/Lagos';
  END IF;
  RETURN NEW;
 END
 $$;

DO $$
 BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='bp_school_settings_region_guard'
    AND tgrelid='public.bp_school_settings'::regclass) THEN
   CREATE TRIGGER bp_school_settings_region_guard
    BEFORE INSERT OR UPDATE OF country_code, time_zone ON public.bp_school_settings
    FOR EACH ROW EXECUTE FUNCTION bright_private.validate_school_region();
  END IF;
 END
 $$;

CREATE OR REPLACE FUNCTION public.bp_relay_submit_morning(p_school uuid, p_child uuid, p_sleep text, p_mood text, p_note text, p_pickup_note text, p_attention boolean, p_day date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'bright_private'
AS $function$
declare uid text:=auth.user_id(); id uuid;local_day date:=(now() at time zone bright_private.school_time_zone(p_school))::date;
begin
 if not bright_private.parent_for_child(p_school,p_child) then raise exception 'Verified parent account required for this child';end if;
 if p_day is null then p_day:=local_day;end if;
 if p_day<local_day-1 or p_day>local_day+1 then raise exception 'Morning handover is limited to today and adjacent days';end if;
 if p_sleep not in ('not_shared','usual','less','restless') or p_mood not in ('not_shared','settled','tired','needs_comfort') then raise exception 'Choose an available care option';end if;
 if length(coalesce(p_note,''))>700 or length(coalesce(p_pickup_note,''))>350 then raise exception 'Please shorten your note';end if;
 if p_attention and length(trim(coalesce(p_note,'')))<8 then raise exception 'Add context so the classroom can understand the concern';end if;
 insert into public.bp_care_relay_mornings(school_id,student_id,parent_user_id,relay_day,sleep_status,morning_mood,note,pickup_note,needs_attention)
 values(p_school,p_child,uid,p_day,p_sleep,p_mood,trim(coalesce(p_note,'')),trim(coalesce(p_pickup_note,'')),coalesce(p_attention,false))
 returning bp_care_relay_mornings.id into id;
 if p_attention then
  insert into public.bp_notifications(school_id,recipient_user_id,student_id,kind,title,summary,target_tab)
  select p_school,m.user_id,p_child,'school_request','A family needs a care follow-up','Review a parent morning handover before the school day.','relay'
  from public.bp_memberships m
  where m.school_id=p_school and m.active and (
    m.role='school_admin' or (m.role='teacher' and exists(
     select 1 from public.bp_students s join public.bp_teacher_classes tc on tc.class_id=s.class_id and tc.school_id=s.school_id
     where s.id=p_child and s.school_id=p_school and tc.teacher_user_id=m.user_id
    ))
  );
 end if;
 return jsonb_build_object('ok',true,'id',id);
exception when unique_violation then raise exception 'You have already shared a morning handover for this child on this date. Send an additional update through school messages.';
end $function$
;

CREATE OR REPLACE FUNCTION public.bp_relay_record_pickup(p_school uuid, p_child uuid, p_contact uuid, p_identity_checked boolean, p_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'bright_private'
AS $function$
declare contact public.bp_pickup_contacts%rowtype;event_id uuid;ack_id uuid;day_date date:=(now() at time zone bright_private.school_time_zone(p_school))::date;
begin
 if not (bright_private.has_role(p_school,array['school_admin']) or bright_private.can_teach(p_school,p_child)) then raise exception 'Assigned staff required';end if;
 if p_identity_checked is not true then raise exception 'Staff must check collector identity in person';end if;
 if length(coalesce(p_note,''))>350 then raise exception 'Pickup note too long';end if;
 select * into contact from public.bp_pickup_contacts where id=p_contact and school_id=p_school and student_id=p_child and status='approved' for share;
 if not found then raise exception 'This pickup contact is not approved for the selected child';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_school::text||':'||p_child::text||':'||day_date::text,0));
 if exists(select 1 from public.bp_pickup_events where school_id=p_school and student_id=p_child
  and event_type='check_out' and (occurred_at at time zone bright_private.school_time_zone(p_school))::date=day_date) then
  raise exception 'Pickup is already recorded for this child today. Review pickup history before trying again.';
 end if;
 insert into public.bp_pickup_events(school_id,student_id,event_type,contact_id,identity_verified,notes,recorded_by)
 values(p_school,p_child,'check_out',p_contact,true,trim(coalesce(p_note,'')),auth.user_id()) returning id into event_id;
 insert into public.bp_care_relay_pickups(school_id,student_id,pickup_event_id,contact_id,confirmed_by)
 values(p_school,p_child,event_id,p_contact,auth.user_id()) returning id into ack_id;
 perform bright_private.notify_guardians(p_school,p_child,'pickup','Verified school pickup recorded',
 'School staff recorded a pickup with an approved contact and an in-person identity check.','relay',auth.user_id());
 return jsonb_build_object('ok',true,'pickup_event_id',event_id,'confirmation_id',ack_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.bp_relay_verify_evenings(p_school uuid, p_children uuid[], p_day date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'bright_private'
AS $function$
declare child uuid;rec jsonb;verified integer:=0;local_day date:=(now() at time zone bright_private.school_time_zone(p_school))::date;
begin
 if p_children is null or cardinality(p_children) not between 1 and 30 then raise exception 'Select between 1 and 30 children';end if;
 if (select count(distinct x) from unnest(p_children) x)<>cardinality(p_children) then raise exception 'Duplicate child IDs are not allowed';end if;
 if p_day is null or p_day>local_day or p_day<local_day-7 then raise exception 'Choose today or one of the previous 7 days';end if;
 foreach child in array p_children loop
  if not (bright_private.has_role(p_school,array['school_admin']) or bright_private.can_teach(p_school,child)) then
   raise exception 'Assigned school staff can verify only their own children';
  end if;
  if not exists(select 1 from public.bp_students where id=child and school_id=p_school and guardian_processing_consent_confirmed) then
   raise exception 'Child consent or enrollment has not been confirmed';
  end if;
  if exists(select 1 from public.bp_care_relay_mornings m
   where m.school_id=p_school and m.student_id=child and m.relay_day=p_day
    and m.needs_attention and m.acknowledged_at is null) then
    raise exception 'An important parent handover must be acknowledged before publishing this child summary';
  end if;
  rec:=bright_private.relay_snapshot(p_school,child,p_day);
  if rec is null or rec->>'attendance' is null then
   raise exception 'Attendance must be recorded before a summary can be verified for every selected child';
  end if;
  insert into public.bp_care_relay_evenings(school_id,student_id,relay_day,verified_by,snapshot)
  values(p_school,child,p_day,auth.user_id(),rec)
  on conflict(school_id,student_id,relay_day)
  do update set snapshot=excluded.snapshot,verified_by=excluded.verified_by,verified_at=now(),revision=bp_care_relay_evenings.revision+1;
  perform bright_private.notify_guardians(p_school,child,'care','Verified school-day summary ready',
   'The school verified a factual summary of records for this child.','relay',auth.user_id());
  verified:=verified+1;
 end loop;
 return jsonb_build_object('ok',true,'verified',verified,'day',p_day);
end $function$
;

CREATE OR REPLACE FUNCTION public.bp_relay_confirm_existing_pickup(p_event uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'bright_private'
AS $function$
declare ev public.bp_pickup_events%rowtype;contact public.bp_pickup_contacts%rowtype; id uuid;
begin
 select * into ev from public.bp_pickup_events where bp_pickup_events.id=p_event for share;
 if not found or ev.event_type<>'check_out' or not ev.identity_verified or ev.contact_id is null then raise exception 'The original pickup event is not a verified checkout';end if;
 if not(bright_private.has_role(ev.school_id,array['school_admin']) or bright_private.can_teach(ev.school_id,ev.student_id)) then raise exception 'Assigned staff required';end if;
 if (ev.occurred_at at time zone bright_private.school_time_zone(ev.school_id))::date<>(now() at time zone bright_private.school_time_zone(ev.school_id))::date then raise exception 'Pickup confirmation must happen on the recorded pickup day';end if;
 select * into contact from public.bp_pickup_contacts where id=ev.contact_id and status='approved' and school_id=ev.school_id and student_id=ev.student_id;
 if not found then raise exception 'Contact is no longer approved';end if;
 insert into public.bp_care_relay_pickups(school_id,student_id,pickup_event_id,contact_id,confirmed_by)
 values(ev.school_id,ev.student_id,ev.id,ev.contact_id,auth.user_id())
 on conflict(pickup_event_id) do nothing returning bp_care_relay_pickups.id into id;
 if id is null then select bp_care_relay_pickups.id into id from public.bp_care_relay_pickups where pickup_event_id=ev.id;end if;
 return jsonb_build_object('ok',true,'confirmation_id',id);
end $function$
;

CREATE OR REPLACE FUNCTION bright_private.relay_snapshot(p_school uuid, p_child uuid, p_day date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'bright_private'
AS $function$
select jsonb_build_object(
 'child_name',s.full_name,
 'relay_day',p_day,
 'attendance',(select a.status from public.bp_attendance a where a.school_id=p_school and a.student_id=p_child and a.attendance_date=p_day order by a.marked_at desc limit 1),
 'care',coalesce((select jsonb_agg(to_jsonb(t) order by t.occurred_at) from (
  select c.event_type,c.details,c.event_value,c.occurred_at from public.bp_care_logs c
  where c.school_id=p_school and c.student_id=p_child
   and (c.occurred_at at time zone bright_private.school_time_zone(p_school))::date=p_day order by c.occurred_at limit 45
 )t),'[]'::jsonb),
 'milestones',coalesce((select jsonb_agg(to_jsonb(t) order by t.observed_at) from (
  select m.title,m.observed_at from public.bp_milestones m
  where m.school_id=p_school and m.student_id=p_child
    and (m.observed_at at time zone bright_private.school_time_zone(p_school))::date=p_day order by m.observed_at limit 15
 )t),'[]'::jsonb),
 'media_count',(select count(*) from public.bp_child_media m
  where m.school_id=p_school and m.student_id=p_child and m.status='ready'
    and (m.created_at at time zone bright_private.school_time_zone(p_school))::date=p_day
    and bright_private.media_consent_ok(p_school,p_child,m.kind)),
 'pickup',(select jsonb_build_object('at',e.occurred_at,'verified',e.identity_verified,
   'relay_confirmed',exists(select 1 from public.bp_care_relay_pickups pc where pc.pickup_event_id=e.id),
   'approved_contact',coalesce(c.full_name,'Unknown contact'))
  from public.bp_pickup_events e left join public.bp_pickup_contacts c on c.id=e.contact_id
  where e.school_id=p_school and e.student_id=p_child and e.event_type='check_out'
   and (e.occurred_at at time zone bright_private.school_time_zone(p_school))::date=p_day order by e.occurred_at desc limit 1)
) from public.bp_students s where s.school_id=p_school and s.id=p_child
$function$
;
