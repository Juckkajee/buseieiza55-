import {readFile,access} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {connect,close,read,query} from '../src/db.js'
import {tables,restoreData} from './database-package.js'

const serverRoot=fileURLToPath(new URL('../',import.meta.url))
const snapshot=new URL('../private/final1-database.json',import.meta.url)
const exists=await access(snapshot).then(()=>true,()=>false)
try {
  if(!process.argv.includes('--apply')) throw Error('Use --apply to install into an EMPTY Oracle schema. Existing data is never replaced.')
  await connect()
  let created=false
  await read(async db=>{
    const found=await query(db,"SELECT table_name FROM user_tables WHERE SUBSTR(table_name,1,4)='BUS_'")
    if(found.length) {
      const names=new Set(found.map(t=>t.tableName))
      const sequences=await query(db,"SELECT sequence_name FROM user_sequences WHERE sequence_name LIKE 'BUS_SEQ_%'")
      if(!tables.every(t=>names.has(t)) || sequences.length<9) throw Error('Existing or partially installed schema detected. Inspect it; installer does not overwrite or erase data.')
      console.log('Existing complete database: kept all data. No import performed.')
      return
    }
    for(const name of ['schema-oracle-DRAFT.sql','002-web-features-REVIEW.sql','004-booking-cancellation-REVIEW.sql']) {
      const sql=await readFile(new URL('../../database-review/'+name,import.meta.url),'utf8')
      for(const statement of sql.replace(/^\s*--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean)) await db.execute(statement)
    }
    if(exists) {
      try {await restoreData(db,snapshot);await db.commit()} catch(e) {await db.rollback();throw e}
    }
    created=true
  })
  await close()
  if(created) {
    if(!exists) {
      const result=spawnSync(process.execPath,['scripts/seed.js'],{cwd:serverRoot,stdio:'inherit',env:process.env})
      if(result.status!==0) throw Error('Starter data failed. Inspect the empty/new database before retrying.')
    }
    const result=spawnSync(process.execPath,['scripts/migrate-sequences-reviewed.js','--apply-reviewed'],{cwd:serverRoot,stdio:'inherit',env:process.env})
    if(result.status!==0) throw Error('Sequence installation failed')
    console.log('Database installed. Account details: server/private/starter-accounts.json (or supplied snapshot account files).')
  }
} catch(e) {console.error('Installation stopped:',e.message);process.exitCode=1}
finally {await close()}
