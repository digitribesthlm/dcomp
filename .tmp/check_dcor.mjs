import { MongoClient } from 'mongodb'
import fs from 'fs'
const env = {}
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const t = l.trim(); if (!t || t.startsWith('#')) return
  const eq = t.indexOf('='); if (eq < 0) return
  let v = t.slice(eq+1).trim(); if (v.startsWith('"')) v = v.slice(1,-1)
  env[t.slice(0,eq).trim()] = v
})
const c = await new MongoClient(env.MONGODB_URI).connect()
const db = c.db(env.MONGODB_DB)

console.log('=== dcor_competitors matching d-cor ===')
const comps = await db.collection('dcor_competitors').find({
  $or: [
    { domain: { $regex: 'd-cor', $options: 'i' } },
    { name: { $regex: 'd-cor', $options: 'i' } },
    { website: { $regex: 'd-cor', $options: 'i' } }
  ]
}).toArray()
comps.forEach(c => console.log({
  _id: String(c._id),
  domain: c.domain,
  name: c.name,
  website: c.website,
  market: c.market,
  country: c.country,
  country_code: c.country_code,
  status: c.status,
  is_known: c.is_known,
  created_at: c.created_at
}))

console.log('\n=== dcomp_seeds matching d-cor ===')
const seeds = await db.collection('dcomp_seeds').find({
  $or: [
    { domain: { $regex: 'd-cor', $options: 'i' } },
    { url: { $regex: 'd-cor', $options: 'i' } }
  ]
}).toArray()
seeds.forEach(s => console.log(s))

console.log('\n=== dcomp_domain_tracking for d-cor.eu ===')
console.log('count:', await db.collection('dcomp_domain_tracking').countDocuments({ domain: /d-cor/i }))
const sample = await db.collection('dcomp_domain_tracking').find({ domain: /d-cor/i }).limit(3).toArray()
sample.forEach(s => console.log({ domain: s.domain, market: s.market, keyword: s.keyword, position: s.position, is_known: s.is_known, date: s.date }))

await c.close()
