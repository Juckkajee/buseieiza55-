import oracledb from "oracledb"
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
let connection
try {
  if (process.env.ORACLE_CLIENT_LIB_DIR)
    oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_LIB_DIR })
  connection = await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString:
      process.env.DB_CONNECT_STRING +
      "?connect_timeout=10&transport_connect_timeout=5&retry_count=0",
  })
  console.log("Oracle version:", connection.oracleServerVersionString)
  const tables = (
    await connection.execute(
      "SELECT table_name FROM user_tables WHERE SUBSTR(table_name,1,4) = 'BUS_' ORDER BY table_name",
    )
  ).rows
  for (const { TABLE_NAME } of tables) {
    if (!/^BUS_[A-Z_]+$/.test(TABLE_NAME)) continue
    const result = await connection.execute(
      `SELECT COUNT(*) AS N FROM ${TABLE_NAME}`,
    )
    console.log(TABLE_NAME, result.rows[0].N, "rows")
  }
  const columns = (
    await connection.execute(
      "SELECT table_name,column_name,data_type,nullable FROM user_tab_columns WHERE SUBSTR(table_name,1,4) = 'BUS_' ORDER BY table_name,column_id",
    )
  ).rows
  console.log(JSON.stringify(columns))
} catch (error) {
  console.error(error.code, error.message)
  process.exitCode = 1
} finally {
  await connection?.close()
}
