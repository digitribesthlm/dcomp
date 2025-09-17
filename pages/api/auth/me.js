import { verifyToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }
  
  try {
    const token = req.cookies['auth-token']
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }
    
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }
    
    return res.status(200).json({
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        clientId: decoded.clientId
      }
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

