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

const runs = db.collection('dcomp_serp_runs')
const tracking = db.collection('dcomp_domain_tracking')

const before = await tracking.countDocuments()
console.log(`dcomp_domain_tracking rows before: ${before}`)

const allRuns = await runs.find({ status: 'success', result_count: { $gt: 0 } }).sort({ run_at: 1 }).toArray()
console.log(`Found ${allRuns.length} successful SERP runs to backfill`)

let inserted = 0
let skipped = 0

for (const run of allRuns) {
  const { keyword, market, keyword_id, run_at, results } = run
  if (!Array.isArray(results) || results.length === 0) {
    skipped++
    continue
  }

  const docs = results.map(r => ({
    tracking_key: `${r.domain}|${keyword}|${market}`,
    domain: r.domain,
    keyword,
    market,
    keyword_id: keyword_id || null,
    current_position: r.position,
    first_seen: run_at,
    last_seen: run_at,
    url: r.url,
    title: r.title || '',
    is_known: !!r.is_known,
    _backfilled: true,
  }))

  if (docs.length) {
    await tracking.insertMany(docs)
    inserted += docs.length
  }
}

const after = await tracking.countDocuments()
console.log(`\nBackfilled: ${inserted} rows`)
console.log(`Skipped (no results): ${skipped}`)
console.log(`dcomp_domain_tracking rows after: ${after}`)

console.log('\n=== Preview of what dashboard will now show ===')
const top = await tracking.aggregate([
  { $sort: { last_seen: -1, _id: -1 } },
  {
    $group: {
      _id: { domain: '$domain', keyword: '$keyword', market: '$market' },
      domain: { $first: '$domain' },
      market: { $first: '$market' },
      latest_position: { $first: '$current_position' },
      is_known: { $first: '$is_known' },
    }
  },
  {
    $group: {
      _id: '$domain',
      domain: { $first: '$domain' },
      market: { $first: '$market' },
      keyword_count: { $sum: 1 },
      avg_position: { $avg: '$latest_position' },
      best_position: { $min: '$latest_position' },
      is_known: { $max: '$is_known' },
    }
  },
  { $sort: { keyword_count: -1, avg_position: 1 } },
  { $limit: 20 }
]).toArray()

console.log(`${'domain'.padEnd(28)} | ${'mkt'.padEnd(4)} | kw | avg | best | known`)
console.log('-'.repeat(72))
for (const d of top) {
  console.log(
    `${d.domain.padEnd(28)} | ${(d.market || '?').padEnd(4)} | ${String(d.keyword_count).padStart(2)} | ${String(Math.round(d.avg_position * 10) / 10).padStart(3)} | ${String(d.best_position).padStart(4)} | ${d.is_known}`
  )
}

await client.close()
