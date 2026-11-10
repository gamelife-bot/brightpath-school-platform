-- BrightPath verified pickup / guardian consent hardening
-- November 10 2026. Non-destructive: no child rows, access requests,
-- memberships, event history or media are changed or deleted.
-- Frontend deployment must be live BEFORE applying this migration.
-- The two new guards restrict browser-authenticated direct writes:
--  - MEDIA: the guardian's checked server RPC runs SECURITY DEFINER as neondb_owner.
--  - PICKUP: the atomic server RPC runs SECURITY DEFINER as neondb_owner.
-- Arrival check-in remains a direct authorized staff insert.
-- The existing after-insert notification trigger is adjusted so an
-- atomic checkout emits ONE guardian notification (from the RPC), not two.
-- If the database owner role changes, revisit this current_user guard.
-- Apply the five statements atomically with the Neon SQL transaction action.

CREATE OR REPLACE FUNCTION bright_private.bp_guardian_media_consent_gate()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO pg_catalog, public
AS $$
BEGIN
 IF (NEW.photo_consent IS DISTINCT FROM OLD.photo_consent
     OR NEW.video_consent IS DISTINCT FROM OLD.video_consent)
    AND current_user <> 'neondb_owner' THEN
   RAISE EXCEPTION 'Media permission can only be changed by a verified guardian from the Parent Portal';
 END IF;
 RETURN NEW;
END
$$;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger
                WHERE tgrelid='public.bp_students'::regclass
                  AND tgname='bp_guardian_media_consent_gate') THEN
   CREATE TRIGGER bp_guardian_media_consent_gate
   BEFORE UPDATE OF photo_consent, video_consent ON public.bp_students
   FOR EACH ROW EXECUTE FUNCTION bright_private.bp_guardian_media_consent_gate();
 END IF;
END
$$;

CREATE OR REPLACE FUNCTION bright_private.bp_verified_checkout_gate()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO pg_catalog, public
AS $$
BEGIN
 IF NEW.event_type='check_out' AND current_user <> 'neondb_owner' THEN
   RAISE EXCEPTION 'Use the verified school pickup procedure to record checkout';
 END IF;
 RETURN NEW;
END
$$;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger
                WHERE tgrelid='public.bp_pickup_events'::regclass
                  AND tgname='bp_verified_checkout_gate') THEN
   CREATE TRIGGER bp_verified_checkout_gate
   BEFORE INSERT ON public.bp_pickup_events
   FOR EACH ROW EXECUTE FUNCTION bright_private.bp_verified_checkout_gate();
 END IF;
END
$$;

CREATE OR REPLACE FUNCTION bright_private.bp_alert_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'bright_private'
AS $function$
declare title_value text; typ text; summary_value text; target_value text;actor text;
begin
 -- A verified checkout is notified by bp_relay_record_pickup after both
 -- pickup event and Care Relay confirmation are committed.
 -- Let the dedicated RPC issue the single precise guardian notification.
 if TG_TABLE_NAME='bp_pickup_events' and new.event_type='check_out' then return new; end if;
 if TG_TABLE_NAME='bp_care_logs' then typ:='care';title_value:='New daily care update';summary_value:='A new care note was added for your child';target_value:='care';actor:=new.created_by;
 elsif TG_TABLE_NAME='bp_milestones' then typ:='milestone';title_value:='New learning milestone';summary_value:='A new development observation is available';target_value:='milestones';actor:=new.teacher_user_id;
 elsif TG_TABLE_NAME='bp_child_media' then typ:=new.kind;title_value:='New classroom '||new.kind;summary_value:='A new private classroom moment is available';target_value:='moments';actor:=new.created_by;
 elsif TG_TABLE_NAME='bp_child_messages' then
    typ:='message';title_value:='New family message';summary_value:='A new message about your child is available';target_value:='messages';actor:=new.sender_user_id;
 elsif TG_TABLE_NAME='bp_pickup_events' then typ:='pickup';title_value:=case when new.event_type='check_out' then 'Child pickup recorded' else 'Child arrival recorded' end;summary_value:='An arrival or pickup update is available';target_value:='pickup';actor:=new.recorded_by;
 elsif TG_TABLE_NAME='bp_incident_reports' then typ:='incident';title_value:='Important care incident recorded';summary_value:='Please review your child’s incident report and contact the school';target_value:='incidents';actor:=new.reported_by;
 else return new;end if;
 perform bright_private.notify_guardians(new.school_id,new.student_id,typ,title_value,summary_value,target_value,actor);
 if TG_TABLE_NAME='bp_child_messages' then
   insert into public.bp_notifications(school_id,recipient_user_id,student_id,kind,title,summary,target_tab)
   select new.school_id,m.user_id,new.student_id,'message','New parent or teacher message',
     'A new family message is ready','messages'
   from public.bp_memberships m
   where m.school_id=new.school_id and m.active
     and m.role='school_admin' and m.user_id<>new.sender_user_id;
   insert into public.bp_notifications(school_id,recipient_user_id,student_id,kind,title,summary,target_tab)
   select new.school_id,tc.teacher_user_id,new.student_id,'message','New message about a child',
     'A family message is ready','messages'
   from public.bp_students s
   join public.bp_teacher_classes tc on tc.school_id=s.school_id and tc.class_id=s.class_id
   join public.bp_memberships m on m.school_id=tc.school_id and m.user_id=tc.teacher_user_id and m.role='teacher' and m.active
   where s.id=new.student_id and s.school_id=new.school_id and tc.teacher_user_id<>new.sender_user_id;
 end if;
 return new;
end $function$

