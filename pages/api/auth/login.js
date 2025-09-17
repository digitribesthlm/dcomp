import { authenticateUser } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }
  
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    
    const result = await authenticateUser(email, password)
    
    if (!result.success) {
      return res.status(401).json({ message: result.message })
    }
    
    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `auth-token=${result.token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    ])
    
    return res.status(200).json({
      message: 'Login successful',
      user: result.user
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

