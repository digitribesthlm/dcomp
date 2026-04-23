import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
  .split('\n').filter(l => l.includes('='))
  .reduce((a,l) => { const [k,...r] = l.split('='); a[k.trim()] = r.join('=').trim(); return a }, {})

const client = new MongoClient(env.MONGODB_URI)
await client.connect()
const db = client.db(env.MONGODB_DB)
const tracking = db.collection('dcomp_domain_tracking')

const total = await tracking.countDocuments()
const backfilled = await tracking.countDocuments({ _backfilled: true })
const live = await tracking.countDocuments({ _backfilled: { $ne: true } })

console.log(`Total rows:       ${total}`)
console.log(`From backfill:    ${backfilled} (re-ingested from dcomp_serp_runs)`)
console.log(`From live n8n:    ${live} (inserted directly by workflow)`)

console.log('\n=== Distinct keywords covered ===')
const kws = await tracking.aggregate([
  { $group: { _id: { keyword: '$keyword', market: '$market' }, rows: { $sum: 1 }, first: { $min: '$last_seen' }, last: { $max: '$last_seen' } } },
  { $sort: { rows: -1 } },
]).toArray()
console.log(`${'keyword'.padEnd(25)} | mkt | rows | first_seen → last_seen`)
console.log('-'.repeat(90))
for (const k of kws) {
  console.log(`${(k._id.keyword || '').padEnd(25)} | ${(k._id.market||'?').padEnd(3)} | ${String(k.rows).padStart(4)} | ${k.first} → ${k.last}`)
}

console.log('\n=== Age of rows ===')
const oldest = await tracking.find().sort({ last_seen: 1 }).limit(1).toArray()
const newest = await tracking.find().sort({ last_seen: -1 }).limit(1).toArray()
if (oldest[0]) console.log(`Oldest row last_seen: ${oldest[0].last_seen}  (${oldest[0].domain} / ${oldest[0].keyword})`)
if (newest[0]) console.log(`Newest row last_seen: ${newest[0].last_seen}  (${newest[0].domain} / ${newest[0].keyword})`)

await client.close()
