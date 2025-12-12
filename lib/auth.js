import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getDatabase } from './mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

export function generateToken(user) {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role,
      clientId: user.clientId 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 12)
}

export async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}

export async function authenticateUser(email, password) {
  try {
    const db = await getDatabase()
    const collectionName = process.env.COLLECTION_NAME_LOGIN
    if (!collectionName) {
      console.error('[Auth] COLLECTION_NAME_LOGIN environment variable not set')
      return { success: false, message: 'Configuration error' }
    }
    console.log('[Auth] Database:', db.databaseName)
    console.log('[Auth] Using collection:', collectionName)
    console.log('[Auth] Looking for email:', email.toLowerCase())
    
    const usersCollection = db.collection(collectionName)
    
    const user = await usersCollection.findOne({ 
      email: email.toLowerCase(),
      status: 'active'
    })
    
    console.log('[Auth] User found:', user ? 'yes' : 'no')
    
    if (!user) {
      // Try without status filter to debug
      const anyUser = await usersCollection.findOne({ email: email.toLowerCase() })
      console.log('[Auth] User exists but not active?:', anyUser ? `status=${anyUser.status}` : 'no user at all')
      return { success: false, message: 'Invalid credentials' }
    }
    
    // For existing users without hashed passwords, compare directly
    // In production, you should hash all passwords
    const isValidPassword = user.password.startsWith('$2') 
      ? await comparePassword(password, user.password)
      : password === user.password
    
    if (!isValidPassword) {
      return { success: false, message: 'Invalid credentials' }
    }
    
    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { last_login: new Date() } }
    )
    
    const token = generateToken(user)
    
    return {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientId: user.clientId
      },
      token
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false, message: 'Authentication failed' }
  }
}

