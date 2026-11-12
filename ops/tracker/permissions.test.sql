\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anonymous;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE SCHEMA bright_private;
CREATE FUNCTION auth.user_id() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('test.identity', true) $$;
CREATE TABLE public.bp_students(id uuid PRIMARY KEY, school_id uuid, class_id uuid, full_name text, guardian_processing_consent_confirmed boolean);
CREATE TABLE public.bp_parent_links(student_id uuid, school_id uuid, parent_user_id text);
CREATE TABLE public.bp_memberships(user_id text, school_id uuid, role text, active boolean);
\ir ../BRIGHTPATH_TRACKERS.sql

INSERT INTO public.bp_students VALUES
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010',NULL,'Student',true);
INSERT INTO public.bp_parent_links SELECT id,school_id,'guardian' FROM public.bp_students;
INSERT INTO public.bp_memberships VALUES
 ('guardian','00000000-0000-0000-0000-000000000010','parent',true),
 ('other','00000000-0000-0000-0000-000000000010','parent',true),
 ('staff','00000000-0000-0000-0000-000000000010','teacher',true);
INSERT INTO bright_private.bp_tracker_devices(id,kind,pairing_hash,pairing_expires_at,report_key_hash)
VALUES ('00000000-0000-0000-0000-000000000020','wristband',sha256(convert_to(repeat('c',22),'UTF8')),now()+interval '1 day',sha256(convert_to(repeat('k',43),'UTF8')));

SET LOCAL ROLE authenticated;
SET LOCAL test.identity='guardian';
DO $$ BEGIN
 IF jsonb_array_length(public.bp_tracker_list()->'students')<>1 THEN RAISE EXCEPTION 'Wrong eligibility'; END IF;
 IF has_function_privilege(current_user,'public.bp_tracker_report(uuid,text,timestamp with time zone,double precision,double precision,integer)','EXECUTE') THEN RAISE EXCEPTION 'Browser can submit telemetry'; END IF;
 BEGIN
  PERFORM public.bp_tracker_pair('00000000-0000-0000-0000-000000000001',repeat('c',22),false);
  RAISE EXCEPTION 'Pairing without consent succeeded' USING ERRCODE='XX000';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF NOT public.bp_tracker_pair('00000000-0000-0000-0000-000000000001',repeat('c',22),true) THEN RAISE EXCEPTION 'Pair failed'; END IF;
END $$;
RESET ROLE;
UPDATE public.bp_students SET class_id='00000000-0000-0000-0000-000000000011';
SET LOCAL ROLE anonymous;
DO $$ DECLARE
 device uuid := '00000000-0000-0000-0000-000000000020';
 measured_at timestamptz := clock_timestamp();
BEGIN
 IF has_function_privilege(current_user,'public.bp_tracker_list()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous read'; END IF;
 IF public.bp_tracker_report(device,repeat('x',43),measured_at,0,0,80) THEN RAISE EXCEPTION 'Invalid key accepted'; END IF;
 IF NOT public.bp_tracker_report(device,repeat('k',43),measured_at,0,0,80) THEN RAISE EXCEPTION 'Valid report rejected'; END IF;
 IF public.bp_tracker_report(device,repeat('k',43),measured_at,0,0,81) THEN RAISE EXCEPTION 'Duplicate report accepted'; END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.bp_tracker_list()->'devices'->0->>'battery' IS DISTINCT FROM '80' THEN RAISE EXCEPTION 'Class move lost tracker'; END IF;
END $$;
SET LOCAL test.identity='other';
DO $$ BEGIN
 IF jsonb_array_length(public.bp_tracker_list()->'devices')<>0 THEN RAISE EXCEPTION 'Another guardian can read location'; END IF;
END $$;
SET LOCAL test.identity='staff';
DO $$ BEGIN
 IF jsonb_array_length(public.bp_tracker_list()->'devices')<>0 THEN RAISE EXCEPTION 'Staff can read location'; END IF;
END $$;
SET LOCAL test.identity='guardian';
SELECT public.bp_tracker_control('00000000-0000-0000-0000-000000000020','pause');
SET LOCAL ROLE anonymous;
DO $$ BEGIN
 IF public.bp_tracker_report('00000000-0000-0000-0000-000000000020',repeat('k',43),clock_timestamp(),0,0,80) THEN RAISE EXCEPTION 'Paused report accepted'; END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.bp_tracker_list()->'devices'->0->>'reportedAt' IS NOT NULL THEN RAISE EXCEPTION 'Paused location retained'; END IF;
END $$;
SELECT public.bp_tracker_control('00000000-0000-0000-0000-000000000020','remove');
ROLLBACK;
