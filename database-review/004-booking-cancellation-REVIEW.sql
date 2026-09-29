-- Review before running. Adds cancellation metadata to BUS_BOOKINGS only.
-- No existing records, PK, FK or constraints are removed or changed.
-- cancelled_by stores the administrator's username as a historical snapshot;
-- it is not a new FK and does not prevent deleting an administrator later.
-- The reason is visible to the booking owner in cancellation history.
ALTER TABLE BUS_BOOKINGS ADD (
    cancellation_reason NVARCHAR2(500),
    cancelled_at TIMESTAMP(0),
    cancelled_by NVARCHAR2(200)
);
