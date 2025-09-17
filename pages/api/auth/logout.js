export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }
  
  // Clear the auth cookie
  res.setHeader('Set-Cookie', [
    'auth-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
  ])
  
  return res.status(200).json({ message: 'Logout successful' })
}

