import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
  .split('\n')
  .filter(l => l.includes('='))
  .reduce((acc, l) => {
    const [k, ...rest] = l.split('=')
    acc[k.trim()] = rest.join('=').trim()
    return acc
  }, {})

const client = new MongoClient(env.MONGODB_URI)
await client.connect()
const db = client.db(env.MONGODB_DB)

const tracking = db.collection('dcomp_domain_tracking')
const runs = db.collection('dcomp_serp_runs')
const keywords = db.collection('dcomp_keywords')

const trackingCount = await tracking.countDocuments()
const runsCount = await runs.countDocuments()
const kwTotal = await keywords.countDocuments()
const kwChecked = await keywords.countDocuments({ last_checked: { $ne: null } })

console.log('=== Collection counts ===')
console.log(`dcomp_domain_tracking: ${trackingCount}`)
console.log(`dcomp_serp_runs:       ${runsCount}`)
console.log(`dcomp_keywords:        ${kwChecked}/${kwTotal} checked today`)

console.log('\n=== Top aggregated domains (what dashboard would show) ===')
const top = await tracking.aggregate([
  {
    $group: {
      _id: '$domain',
      domain: { $first: '$domain' },
      market: { $first: '$market' },
      keyword_count: { $sum: 1 },
      avg_position: { $avg: '$current_position' },
      best_position: { $min: '$current_position' },
      is_known: { $last: '$is_known' },
      last_seen: { $max: '$last_seen' },
    }
  },
  { $sort: { keyword_count: -1, avg_position: 1 } },
  { $limit: 20 }
]).toArray()

console.log(`domain | market | kw_count | avg_pos | best | is_known`)
console.log('-'.repeat(80))
for (const d of top) {
  console.log(
    `${d.domain.padEnd(30)} | ${(d.market || '?').padEnd(4)} | ${String(d.keyword_count).padStart(3)} | ${String(Math.round(d.avg_position * 10) / 10).padStart(5)} | ${String(d.best_position).padStart(3)} | ${d.is_known}`
  )
}

console.log('\n=== Latest SERP runs ===')
const latestRuns = await runs.find({}, { projection: { keyword: 1, market: 1, result_count: 1, status: 1, run_at: 1 } })
  .sort({ _id: -1 }).limit(10).toArray()
for (const r of latestRuns) {
  console.log(`${r.run_at} | ${r.keyword.padEnd(20)} | ${r.market} | ${r.result_count} results | ${r.status}`)
}

await client.close()
