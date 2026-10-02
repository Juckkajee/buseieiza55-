import oracledb from "oracledb"
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
let pool
export const capabilities = { vehicleExtras: false, tripEvents: false, readableIds: false, bookingCancellation: false }
const camel = (key) =>
  key.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())
export async function query(db, sql, binds = {}) {
  const result = await db.execute(sql, binds)
  return (
    result.rows?.map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [camel(k), v])),
    ) ?? []
  )
}
export async function connect() {
  if (process.env.ORACLE_CLIENT_LIB_DIR)
    oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_LIB_DIR })
  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString:
      process.env.DB_CONNECT_STRING +
      "?connect_timeout=10&transport_connect_timeout=5&retry_count=0",
    poolMin: 1,
    poolMax: 6,
    poolIncrement: 1,
    queueTimeout: 15000,
  })
  await read(async (db) => {
    capabilities.bookingCancellation = (await query(db, "SELECT COUNT(*) n FROM user_tab_columns WHERE table_name='BUS_BOOKINGS' AND column_name IN ('CANCELLATION_REASON','CANCELLED_AT','CANCELLED_BY')"))[0].n === 3
    capabilities.readableIds = (await query(db, "SELECT COUNT(*) n FROM user_sequences WHERE sequence_name IN ('BUS_SEQ_EMPLOYEE','BUS_SEQ_USER','BUS_SEQ_BOOKING','BUS_SEQ_VEHICLE','BUS_SEQ_ROUTE','BUS_SEQ_STOP','BUS_SEQ_ROUTE_STOP','BUS_SEQ_TRIP','BUS_SEQ_POSITION')"))[0].n === 9
    capabilities.vehicleExtras =
      (
        await query(
          db,
          "SELECT COUNT(*) n FROM user_tab_columns WHERE table_name='BUS_VEHICLES' AND column_name IN ('BRAND','MODEL_YEAR','AVAILABILITY')",
        )
      )[0].n === 3
    capabilities.tripEvents =
      (
        await query(
          db,
          "SELECT COUNT(*) n FROM user_tables WHERE table_name='BUS_TRIP_EVENTS'",
        )
      )[0].n === 1
  })
}
export async function read(fn) {
  const db = await pool.getConnection()
  try {
    db.callTimeout = 15000
    await db.execute("ALTER SESSION SET TIME_ZONE = '+07:00'")
    return await fn(db)
  } finally {
    await db.close()
  }
}
export async function transaction(fn) {
  return read(async (db) => {
    try {
      const result = await fn(db)
      await db.commit()
      return result
    } catch (error) {
      await db.rollback()
      throw error
    }
  })
}
export async function close() {
  const current = pool
  pool = undefined
  if (current) await current.close(5)
}
export const ts = (column) => `TO_CHAR(${column},'YYYY-MM-DD"T"HH24:MI:SS')`
