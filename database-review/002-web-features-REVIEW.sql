-- Additional fields needed by the existing Figma screens. Review before running.
-- No existing table/data is removed. Run ONCE after the 13-table schema.
ALTER TABLE BUS_VEHICLES ADD (
    brand NVARCHAR2(150),
    model_year NUMBER(4),
    availability VARCHAR2(20 CHAR) DEFAULT 'AVAILABLE' NOT NULL,
    CONSTRAINT BUS_CK_VEHICLE_AVAIL CHECK (availability IN ('AVAILABLE','MAINTENANCE'))
);

-- PK: event_id. FK trip_id -> BUS_TRIP_ROUNDS.trip_id.
-- FK route_stop_id -> BUS_ROUTE_STOPS.route_stop_id (only for STOP events).
-- START/FINISH record actual start/end time; STOP records each checkpoint.
-- The server also checks that the checkpoint belongs to this trip's route.
CREATE TABLE BUS_TRIP_EVENTS (
    event_id VARCHAR2(40 CHAR) NOT NULL,
    trip_id VARCHAR2(40 CHAR) NOT NULL,
    route_stop_id VARCHAR2(40 CHAR),
    event_type VARCHAR2(10 CHAR) NOT NULL,
    event_at TIMESTAMP(0) DEFAULT LOCALTIMESTAMP NOT NULL,
    CONSTRAINT BUS_PK_TRIP_EVENTS PRIMARY KEY (event_id),
    CONSTRAINT BUS_FK_EVENT_TRIP FOREIGN KEY (trip_id) REFERENCES BUS_TRIP_ROUNDS(trip_id),
    CONSTRAINT BUS_FK_EVENT_STOP FOREIGN KEY (route_stop_id) REFERENCES BUS_ROUTE_STOPS(route_stop_id),
    CONSTRAINT BUS_CK_EVENT_KIND CHECK (event_type IN ('START','STOP','FINISH')),
    CONSTRAINT BUS_CK_EVENT_STOP CHECK (
        (event_type = 'STOP' AND route_stop_id IS NOT NULL) OR
        (event_type IN ('START','FINISH') AND route_stop_id IS NULL)
    )
);
CREATE UNIQUE INDEX BUS_UQ_TRIP_EVENT ON BUS_TRIP_EVENTS(trip_id,event_type,NVL(route_stop_id,'-'));
CREATE INDEX BUS_IX_EVENT_STOP ON BUS_TRIP_EVENTS(route_stop_id);
