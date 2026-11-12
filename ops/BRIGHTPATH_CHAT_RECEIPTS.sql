BEGIN;

CREATE TABLE IF NOT EXISTS bright_private.chat_receipts (
  classroom_message_id uuid REFERENCES public.bp_child_messages(id) ON DELETE CASCADE,
  office_message_id uuid REFERENCES public.bp_admin_thread_messages(id) ON DELETE CASCADE,
  recipient_user_id text NOT NULL,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (num_nonnulls(classroom_message_id, office_message_id) = 1),
  UNIQUE NULLS NOT DISTINCT (classroom_message_id, office_message_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS bp_chat_receipts_office_message
  ON bright_private.chat_receipts (office_message_id) WHERE office_message_id IS NOT NULL;

REVOKE ALL ON bright_private.chat_receipts FROM PUBLIC, anonymous, authenticated;

CREATE OR REPLACE FUNCTION public.bp_chat_receipts(
  p_kind text, p_ids uuid[], p_read_ids uuid[] DEFAULT '{}'
) RETURNS TABLE (message_id uuid, delivered_at timestamptz, read_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  viewer text := auth.user_id();
BEGIN
  IF viewer IS NULL THEN
    RAISE EXCEPTION 'Sign in to view message receipts' USING ERRCODE = '42501';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('classroom', 'office')
    OR cardinality(p_ids) > 700 OR cardinality(p_read_ids) > 700 THEN
    RAISE EXCEPTION 'Invalid message receipt request' USING ERRCODE = '22023';
  END IF;

  -- Store receipts for incoming messages only, with the same access checks as message RLS.
  WITH visible AS (
    SELECT id, sender_user_id FROM public.bp_child_messages
     WHERE p_kind = 'classroom' AND id = ANY(p_ids)
       AND bright_private.student_visible(school_id, student_id)
    UNION ALL
    SELECT id, sender_user_id FROM public.bp_admin_thread_messages
     WHERE p_kind = 'office' AND id = ANY(p_ids)
       AND bright_private.can_access_admin_thread(conversation_id, school_id)
  )
  INSERT INTO bright_private.chat_receipts AS receipt (
    classroom_message_id, office_message_id, recipient_user_id, read_at
  )
  SELECT CASE WHEN p_kind = 'classroom' THEN id END,
         CASE WHEN p_kind = 'office' THEN id END,
         viewer, CASE WHEN id = ANY(p_read_ids) THEN now() END
  FROM visible WHERE sender_user_id <> viewer ORDER BY id
  ON CONFLICT (classroom_message_id, office_message_id, recipient_user_id)
  DO UPDATE SET read_at = EXCLUDED.read_at
  WHERE receipt.read_at IS NULL AND EXCLUDED.read_at IS NOT NULL;

  -- Return the first delivery/read to the sender without exposing the reader's identity.
  RETURN QUERY
  WITH outgoing AS (
    SELECT id FROM public.bp_child_messages
     WHERE p_kind = 'classroom' AND id = ANY(p_ids) AND sender_user_id = viewer
       AND bright_private.student_visible(school_id, student_id)
    UNION ALL
    SELECT id FROM public.bp_admin_thread_messages
     WHERE p_kind = 'office' AND id = ANY(p_ids) AND sender_user_id = viewer
       AND bright_private.can_access_admin_thread(conversation_id, school_id)
  )
  SELECT o.id, min(r.delivered_at), min(r.read_at)
  FROM outgoing o
  JOIN bright_private.chat_receipts r
    ON (p_kind = 'classroom' AND r.classroom_message_id = o.id)
    OR (p_kind = 'office' AND r.office_message_id = o.id)
  GROUP BY o.id;
END;
$$;

REVOKE ALL ON FUNCTION public.bp_chat_receipts(text, uuid[], uuid[]) FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.bp_chat_receipts(text, uuid[], uuid[]) TO authenticated;

-- Inspect pickup-only fields inside the pickup branch of the shared trigger.
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
 if TG_TABLE_NAME='bp_care_logs' then typ:='care';title_value:='New daily care update';summary_value:='A new care note was added for your child';target_value:='care';actor:=new.created_by;
 elsif TG_TABLE_NAME='bp_milestones' then typ:='milestone';title_value:='New learning milestone';summary_value:='A new development observation is available';target_value:='milestones';actor:=new.teacher_user_id;
 elsif TG_TABLE_NAME='bp_child_media' then typ:=new.kind;title_value:='New classroom '||new.kind;summary_value:='A new private classroom moment is available';target_value:='moments';actor:=new.created_by;
 elsif TG_TABLE_NAME='bp_child_messages' then
    typ:='message';title_value:='New family message';summary_value:='A new message about your child is available';target_value:='messages';actor:=new.sender_user_id;
 elsif TG_TABLE_NAME='bp_pickup_events' then
    if new.event_type='check_out' then return new; end if;
    typ:='pickup';title_value:='Child arrival recorded';summary_value:='An arrival or pickup update is available';target_value:='pickup';actor:=new.recorded_by;
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
end $function$;

COMMIT;
