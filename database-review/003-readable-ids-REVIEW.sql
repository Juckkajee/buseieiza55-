-- REVIEW: running IDs for new records only; existing IDs are NOT changed.
-- Adds 9 Oracle SEQUENCE objects. No table, column, PK or FK is changed.
-- Examples: E006, U002, BK001, V006, R004, S007, RS001, T001, POS001.
-- Start after the largest existing ID matching PREFIX + digits.
-- UUID IDs, E-ADMIN and date-based daily trip IDs are deliberately excluded.
-- NEXTVAL is concurrency-safe and never reuses a deleted record's ID.
-- Rollbacks may leave gaps; numbers are unique, not guaranteed gap-free.
-- Run ONCE after review and approval. Restart the server afterwards.
DECLARE
  existing_names NUMBER;
  PROCEDURE create_id_sequence(seq_name VARCHAR2, table_name VARCHAR2,
                               column_name VARCHAR2, prefix VARCHAR2) IS
    next_number NUMBER;
  BEGIN
    EXECUTE IMMEDIATE 'SELECT NVL(MAX(CASE WHEN REGEXP_LIKE(' || column_name ||
      ',:pattern) THEN TO_NUMBER(SUBSTR(' || column_name ||
      ',:start_pos)) END),0)+1 FROM ' || table_name
      INTO next_number USING '^' || prefix || '[0-9]+$', LENGTH(prefix)+1;
    IF next_number > 999999999 THEN
      RAISE_APPLICATION_ERROR(-20003, 'ID range exhausted: ' || seq_name);
    END IF;
    EXECUTE IMMEDIATE 'CREATE SEQUENCE ' || seq_name || ' START WITH ' ||
      TO_CHAR(next_number,'FM999999999') ||
      ' INCREMENT BY 1 MAXVALUE 999999999 NOCYCLE NOCACHE';
  END;
BEGIN
  SELECT COUNT(*) INTO existing_names FROM user_objects WHERE object_name IN (
    'BUS_SEQ_EMPLOYEE','BUS_SEQ_USER','BUS_SEQ_BOOKING','BUS_SEQ_VEHICLE',
    'BUS_SEQ_ROUTE','BUS_SEQ_STOP','BUS_SEQ_ROUTE_STOP','BUS_SEQ_TRIP','BUS_SEQ_POSITION'
  );
  IF existing_names > 0 THEN
    RAISE_APPLICATION_ERROR(-20002, 'ID sequences already exist or are partially installed. Inspect before retrying.');
  END IF;
  create_id_sequence('BUS_SEQ_EMPLOYEE','BUS_EMPLOYEES','EMPLOYEE_ID','E');
  create_id_sequence('BUS_SEQ_USER','BUS_USERS','USER_ID','U');
  create_id_sequence('BUS_SEQ_BOOKING','BUS_BOOKINGS','BOOKING_ID','BK');
  create_id_sequence('BUS_SEQ_VEHICLE','BUS_VEHICLES','VEHICLE_ID','V');
  create_id_sequence('BUS_SEQ_ROUTE','BUS_ROUTES','ROUTE_ID','R');
  create_id_sequence('BUS_SEQ_STOP','BUS_STOPS','STOP_ID','S');
  create_id_sequence('BUS_SEQ_ROUTE_STOP','BUS_ROUTE_STOPS','ROUTE_STOP_ID','RS');
  create_id_sequence('BUS_SEQ_TRIP','BUS_TRIP_ROUNDS','TRIP_ID','T');
  create_id_sequence('BUS_SEQ_POSITION','BUS_POSITIONS','POSITION_ID','POS');
END;
/
