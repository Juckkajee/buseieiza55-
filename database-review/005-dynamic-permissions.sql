-- Upgrade legacy Admin access from the former hard-coded bypass to stored grants.
-- Only the two screens added after the original seven-screen seed are missing.
-- Existing rows (including disabled permissions) are never changed.
MERGE INTO BUS_POSITION_PERMISSIONS p
USING (
  SELECT 'ADMIN' position_id, screen_id
  FROM BUS_SCREENS
  WHERE screen_id IN ('admin-users','admin-bookings')
) s
ON (p.position_id=s.position_id AND p.screen_id=s.screen_id)
WHEN NOT MATCHED THEN INSERT(permission_id,position_id,screen_id,can_view,can_modify)
VALUES('ADMIN-'||s.screen_id,s.position_id,s.screen_id,1,1);
