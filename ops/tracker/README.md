# BrightPath tracker installation

The Parent Portal uses the production tracker RPCs from [BRIGHTPATH_TRACKERS.sql](../BRIGHTPATH_TRACKERS.sql). A student is eligible through an active verified guardian link and recorded processing consent. The tracker is paired with the student ID, so changing classes does not require a new pairing code. Only the guardian who pairs the device can read its reports. Location is cleared when that guardian pauses or removes the device.

## Pair a physical device

1. Confirm the exact hardware model, SIM and vendor protocol. Configure a vendor adapter to produce a BrightPath report with `deviceId`, `reportedAt` (ISO 8601 with timezone), `latitude`, `longitude` and `batteryPercent`. Use the measurement time. Forward reports with a valid location fix.
2. As the BrightPath installer, generate separate URL-safe values from at least 16 random bytes for the one-time pairing code and 32 random bytes for the report key. Use parameters in a private database client to provision the row. Supply the device kind, pairing code, and report key as the three parameters below.

   ```sql
   INSERT INTO bright_private.bp_tracker_devices(kind, pairing_hash, pairing_expires_at, report_key_hash)
   VALUES ($1, sha256(convert_to($2,'UTF8')), clock_timestamp()+interval '24 hours', sha256(convert_to($3,'UTF8')))
   RETURNING id;
   ```

3. Send the pairing code privately to the verified guardian. They open **Parent Portal → Devices**, choose their student, enter the pairing code, and confirm location consent. Supply the returned ID and separate report key only to the adapter.
4. Set `BP_AUTH_URL`, `BP_DATA_URL`, `BP_TRACKER_ID` and `BP_TRACKER_REPORT_KEY` in the adapter environment. Pipe a normalized report into `node ops/tracker/send-report.mjs`. The adapter uses the existing Neon HTTPS Data API and the device key. Refresh Devices to confirm the coordinates, timestamp, and battery.
5. Test with an adult carrying the sample. Confirm how it behaves with a weak signal, no location fix, a low battery, a restart, and duplicate reports. Verify that unrelated guardian and school staff accounts cannot see the location. For a reassignment, remove the old device association and provision a new device record and credentials.

The local simulator and loopback receiver remain available for engineering tests. The production Parent Portal reads only stored reports from paired devices.
