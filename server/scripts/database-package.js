import {readFile,writeFile,mkdir} from 'node:fs/promises'
import oracledb from 'oracledb'
import {connect,close,read,query} from '../src/db.js'

export const tables=['BUS_DEPARTMENTS','BUS_POSITIONS','BUS_SCREENS','BUS_EMPLOYEES','BUS_USERS','BUS_VEHICLES','BUS_STOPS','BUS_ROUTES','BUS_ROUTE_STOPS','BUS_TRIP_ROUNDS','BUS_BOOKINGS','BUS_BOOKING_DETAILS','BUS_POSITION_PERMISSIONS','BUS_TRIP_EVENTS']
export async function exportDatabase(file) {
  await connect()
  try {
    const snapshot=await read(async db=>{
      await db.execute('SET TRANSACTION READ ONLY')
      const result={format:1,createdAt:new Date().toISOString(),tables:[]}
      for(const name of tables) {
        const columns=await query(db,'SELECT column_name name,data_type type FROM user_tab_columns WHERE table_name=:name ORDER BY column_id',{name})
        const select=columns.map(c=>c.type.startsWith('TIMESTAMP') ? `TO_CHAR(${c.name},'YYYY-MM-DD"T"HH24:MI:SS.FF6') ${c.name}` : c.name).join(',')
        const data=await db.execute(`SELECT ${select} FROM ${name}`)
        result.tables.push({name,columns,rows:data.rows.map(row=>columns.map(c=>row[c.name]))})
      }
      return result
    })
    await writeFile(file,JSON.stringify(snapshot),{flag:'wx'})
    console.log('Snapshot saved:',snapshot.tables.map(t=>`${t.name}:${t.rows.length}`).join(', '))
  } finally {await close()}
}
export async function restoreData(db,file) {
  const snapshot=JSON.parse(await readFile(file,'utf8'))
  if(snapshot.format!==1 || snapshot.tables.length!==tables.length) throw Error('Unsupported snapshot')
  for(const name of tables) {
    const source=snapshot.tables.find(t=>t.name===name)
    if(!source) throw Error('Missing table '+name)
    const dest=await query(db,'SELECT column_name name,data_type type FROM user_tab_columns WHERE table_name=:name ORDER BY column_id',{name})
    if(JSON.stringify(dest)!==JSON.stringify(source.columns)) throw Error('Column mismatch: '+name)
    const [{n}]=await query(db,`SELECT COUNT(*) n FROM ${name}`)
    if(n) throw Error('Refusing to overwrite non-empty table '+name)
    const values=dest.map((c,i)=>c.type.startsWith('TIMESTAMP')?`TO_TIMESTAMP(:${i+1},'YYYY-MM-DD"T"HH24:MI:SS.FF6')`:`:${i+1}`)
    const sql=`INSERT INTO ${name} (${dest.map(c=>c.name).join(',')}) VALUES (${values.join(',')})`
    const bindDefs=dest.map(c=>c.type==='NUMBER'?{type:oracledb.NUMBER}:{type:oracledb.STRING,maxSize:8000})
    for(let i=0;i<source.rows.length;i+=500) await db.executeMany(sql,source.rows.slice(i,i+500),{bindDefs})
    const [actual]=await query(db,`SELECT COUNT(*) n FROM ${name}`)
    if(actual.n!==source.rows.length) throw Error('Count mismatch: '+name)
  }
  return snapshot
}
if(process.argv[2]==='export') {
  await mkdir(new URL('../private/',import.meta.url),{recursive:true})
  await exportDatabase(process.argv[3] || new URL('../private/final1-database.json',import.meta.url))
}
