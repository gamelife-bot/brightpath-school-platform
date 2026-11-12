-- Device ownership follows the student ID and verified guardian, never the class.
CREATE TABLE IF NOT EXISTS bright_private.bp_tracker_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('bag','wristband')),
  pairing_hash bytea UNIQUE,
  pairing_expires_at timestamptz,
  report_key_hash bytea NOT NULL UNIQUE,
  guardian_id text,
  student_id uuid REFERENCES public.bp_students(id) ON DELETE SET NULL,
  paired_at timestamptz,
  paused boolean NOT NULL DEFAULT false,
  retired boolean NOT NULL DEFAULT false,
  reported_at timestamptz,
  latitude double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude BETWEEN -180 AND 180),
  battery integer CHECK (battery BETWEEN 0 AND 100)
);

ALTER TABLE bright_private.bp_tracker_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bright_private.bp_tracker_devices FROM PUBLIC, anonymous, authenticated;

CREATE OR REPLACE FUNCTION bright_private.bp_tracker_guardian(p_student uuid, p_guardian text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.bp_students s
   JOIN public.bp_parent_links l ON l.student_id=s.id AND l.school_id=s.school_id
   JOIN public.bp_memberships m ON m.school_id=s.school_id AND m.user_id=l.parent_user_id
   WHERE s.id=p_student AND l.parent_user_id=p_guardian AND m.role='parent' AND m.active
     AND s.guardian_processing_consent_confirmed IS TRUE
 );
$$;

CREATE OR REPLACE FUNCTION public.bp_tracker_list()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object(
  'students', COALESCE((
   SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name) ORDER BY s.full_name)
   FROM public.bp_students s WHERE bright_private.bp_tracker_guardian(s.id,auth.user_id())
  ),'[]'::jsonb),
  'devices', COALESCE((
   SELECT jsonb_agg(jsonb_build_object('id',d.id,'kind',d.kind,'studentId',d.student_id,
      'paused',d.paused,'reportedAt',d.reported_at,'latitude',d.latitude,'longitude',d.longitude,'battery',d.battery)
      ORDER BY d.paired_at)
   FROM bright_private.bp_tracker_devices d WHERE d.guardian_id=auth.user_id() AND NOT d.retired
     AND bright_private.bp_tracker_guardian(d.student_id,d.guardian_id)
  ),'[]'::jsonb)
 );
$$;

CREATE OR REPLACE FUNCTION public.bp_tracker_pair(p_student uuid, p_code text, p_consent boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE guardian text := auth.user_id();
BEGIN
 IF p_consent IS DISTINCT FROM true OR guardian IS NULL OR
    NOT bright_private.bp_tracker_guardian(p_student,guardian) THEN
  RAISE EXCEPTION 'Verified guardian access and tracking consent are required.';
 END IF;
 IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9_-]{22,86}$' THEN
  RAISE EXCEPTION 'Use the pairing code supplied with your device.';
 END IF;
 UPDATE bright_private.bp_tracker_devices
 SET student_id=p_student, guardian_id=guardian, paired_at=clock_timestamp(),
     pairing_hash=NULL, pairing_expires_at=NULL
 WHERE pairing_hash=sha256(convert_to(p_code,'UTF8')) AND pairing_expires_at>clock_timestamp()
   AND guardian_id IS NULL AND NOT retired;
 IF NOT FOUND THEN RAISE EXCEPTION 'That pairing code is unavailable or expired.'; END IF;
 RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.bp_tracker_control(p_device uuid, p_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF p_action IS NULL OR p_action NOT IN ('pause','resume','remove') THEN RAISE EXCEPTION 'Invalid device action.'; END IF;
 UPDATE bright_private.bp_tracker_devices
 SET paused=(p_action<>'resume'), retired=(p_action='remove'),
     guardian_id=CASE WHEN p_action='remove' THEN NULL ELSE guardian_id END,
     student_id=CASE WHEN p_action='remove' THEN NULL ELSE student_id END,
     paired_at=CASE WHEN p_action='resume' AND paused THEN clock_timestamp() ELSE paired_at END,
     latitude=CASE WHEN p_action<>'resume' THEN NULL ELSE latitude END,
     longitude=CASE WHEN p_action<>'resume' THEN NULL ELSE longitude END,
     battery=CASE WHEN p_action<>'resume' THEN NULL ELSE battery END,
     reported_at=CASE WHEN p_action<>'resume' THEN NULL ELSE reported_at END
 WHERE id=p_device AND guardian_id=auth.user_id() AND NOT retired
   AND (p_action='remove' OR bright_private.bp_tracker_guardian(student_id,guardian_id));
 IF NOT FOUND THEN RAISE EXCEPTION 'This device is unavailable.'; END IF;
 RETURN true;
END;
$$;

-- Installer integration calls this function using a restricted server credential.
-- Browser roles have no access to ingestion.
CREATE OR REPLACE FUNCTION bright_private.bp_tracker_receive(
 p_device uuid, p_key text, p_at timestamptz, p_lat double precision, p_lon double precision, p_battery integer
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF p_key IS NULL OR p_key !~ '^[A-Za-z0-9_-]{43,86}$'
   OR p_at IS NULL OR NOT isfinite(p_at) OR p_at>clock_timestamp()
   OR p_lat IS NULL OR p_lat NOT BETWEEN -90 AND 90
   OR p_lon IS NULL OR p_lon NOT BETWEEN -180 AND 180
   OR p_battery IS NULL OR p_battery NOT BETWEEN 0 AND 100 THEN RETURN false; END IF;
 UPDATE bright_private.bp_tracker_devices
 SET reported_at=p_at, latitude=p_lat, longitude=p_lon, battery=p_battery
 WHERE id=p_device AND report_key_hash=sha256(convert_to(p_key,'UTF8')) AND NOT paused AND NOT retired
   AND paired_at<=p_at AND (reported_at IS NULL OR reported_at<p_at)
   AND bright_private.bp_tracker_guardian(student_id,guardian_id);
 RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION bright_private.bp_tracker_guardian(uuid,text), bright_private.bp_tracker_receive(uuid,text,timestamptz,double precision,double precision,integer) FROM PUBLIC, anonymous, authenticated;
REVOKE ALL ON FUNCTION public.bp_tracker_list(), public.bp_tracker_pair(uuid,text,boolean), public.bp_tracker_control(uuid,text) FROM PUBLIC, anonymous, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_tracker_list(), public.bp_tracker_pair(uuid,text,boolean), public.bp_tracker_control(uuid,text) TO authenticated;

-- The device key is supplied by the hardware adapter and cannot be read from any browser RPC.
CREATE OR REPLACE FUNCTION public.bp_tracker_report(
 p_device uuid, p_key text, p_at timestamptz, p_lat double precision, p_lon double precision, p_battery integer
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT bright_private.bp_tracker_receive(p_device,p_key,p_at,p_lat,p_lon,p_battery);
$$;
REVOKE ALL ON FUNCTION public.bp_tracker_report(uuid,text,timestamptz,double precision,double precision,integer) FROM PUBLIC, anonymous, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_tracker_report(uuid,text,timestamptz,double precision,double precision,integer) TO anonymous;
