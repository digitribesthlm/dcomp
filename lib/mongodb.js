import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const options = {}

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local')
}

let client
let clientPromise

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export const getDatabase = async () => {
  const client = await clientPromise
  // If MONGODB_DB not provided, driver uses default from URI
  return client.db(process.env.MONGODB_DB || undefined)
}

export const getCollectionName = () => {
  return process.env.COLLECTION_NAME || 'dcor_competitors'
}

export default clientPromise


