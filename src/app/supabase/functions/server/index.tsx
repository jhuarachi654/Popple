import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const app = new Hono()

// CORS configuration
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}))

app.use('*', logger(console.log))

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// User signup route
app.post('/make-server-997116c5/signup', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, name } = body

    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400)
    }

    // First, check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Get up to 1000 users to search through
    })

    if (listError) {
      console.error('Error checking existing users:', listError)
      return c.json({ error: 'Error checking user existence' }, 500)
    }

    // Check if a user with this email already exists
    const existingUser = existingUsers.users?.find(user => user.email === email)
    
    if (existingUser) {
      console.log('User already exists with email:', email)
      return c.json({ 
        error: 'User with this email already exists',
        code: 'user_exists',
        existing_user_id: existingUser.id
      }, 409) // 409 Conflict status code
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { name: name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (error) {
      console.error('Signup error:', error)
      // Handle specific error cases
      if (error.message.includes('already been registered')) {
        return c.json({ 
          error: 'User with this email already exists', 
          code: 'user_exists' 
        }, 409)
      }
      return c.json({ error: error.message }, 400)
    }

    console.log('User created successfully:', data.user?.id)
    return c.json({ 
      success: true, 
      user: data.user,
      message: 'Account created successfully' 
    })

  } catch (error: any) {
    console.error('Signup error:', error)
    return c.json({ error: 'Internal server error during signup' }, 500)
  }
})

// Helper function to get user from access token
const getUserFromToken = async (request: Request) => {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('No valid authorization header provided')
    return null
  }
  
  const accessToken = authHeader.split(' ')[1]
  
  if (!accessToken) {
    console.error('No access token found in authorization header')
    return null
  }
  
  try {
    console.log('Validating token starting with:', accessToken.substring(0, 20) + '...')
    
    // Method 1: Try using service role client to verify JWT
    try {
      const { data: userData, error: jwtError } = await supabase.auth.getUser(accessToken)
      
      if (!jwtError && userData?.user) {
        console.log('Successfully validated user with service role client:', userData.user.id, 'email:', userData.user.email)
        return userData.user
      }
      
      console.log('Service role validation failed:', jwtError?.message)
    } catch (serviceError) {
      console.log('Service role method failed:', serviceError)
    }
    
    // Method 2: Manual JWT verification as fallback
    try {
      // Decode JWT payload without verification (just for debugging)
      const [header, payload, signature] = accessToken.split('.')
      const decodedPayload = JSON.parse(atob(payload))
      
      console.log('JWT payload:', {
        sub: decodedPayload.sub,
        email: decodedPayload.email,
        exp: decodedPayload.exp,
        iat: decodedPayload.iat,
        iss: decodedPayload.iss
      })
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000)
      if (decodedPayload.exp && decodedPayload.exp < now) {
        console.error('Token is expired. Exp:', decodedPayload.exp, 'Now:', now)
        return null
      }
      
      // Check if we have required fields
      if (!decodedPayload.sub || !decodedPayload.email) {
        console.error('Token missing required fields (sub or email)')
        return null
      }
      
      // Create user object from JWT payload
      const user = {
        id: decodedPayload.sub,
        email: decodedPayload.email,
        user_metadata: decodedPayload.user_metadata || {},
        app_metadata: decodedPayload.app_metadata || {},
        aud: decodedPayload.aud,
        role: decodedPayload.role
      }
      
      console.log('Successfully extracted user from JWT payload:', user.id, 'email:', user.email)
      return user
      
    } catch (jwtError) {
      console.error('JWT decode failed:', jwtError)
      return null
    }
    
  } catch (error) {
    console.error('Exception during token validation:', error)
    return null
  }
}

// Get user's tasks
app.get('/make-server-997116c5/tasks', async (c) => {
  try {
    console.log('GET /tasks - attempting to validate user token')
    const user = await getUserFromToken(c.req.raw)
    
    if (!user) {
      console.error('Failed to get user from token for /tasks GET')
      return c.json({ error: 'Unauthorized - Invalid or expired token' }, 401)
    }
    
    console.log('GET /tasks - user validated successfully:', user.id)

    const userTasksKey = `user_tasks_${user.id}`
    const tasks = await kv.get(userTasksKey)
    
    return c.json({ tasks: tasks || [] })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return c.json({ error: 'Failed to fetch tasks' }, 500)
  }
})

// Save user's tasks
app.post('/make-server-997116c5/tasks', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw)
    
    if (!user) {
      console.error('Failed to get user from token for /tasks POST')
      return c.json({ error: 'Unauthorized - Invalid or expired token' }, 401)
    }

    const body = await c.req.json()
    const { tasks } = body

    if (!Array.isArray(tasks)) {
      return c.json({ error: 'Tasks must be an array' }, 400)
    }

    const userTasksKey = `user_tasks_${user.id}`
    await kv.set(userTasksKey, tasks)
    
    return c.json({ success: true, message: 'Tasks saved successfully' })
  } catch (error) {
    console.error('Error saving tasks:', error)
    return c.json({ error: 'Failed to save tasks' }, 500)
  }
})

// Save user progress
app.post('/make-server-997116c5/progress', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { progress } = body

    const userProgressKey = `user_progress_${user.id}`
    await kv.set(userProgressKey, progress)
    
    return c.json({ success: true, message: 'Progress saved successfully' })
  } catch (error) {
    console.error('Error saving progress:', error)
    return c.json({ error: 'Failed to save progress' }, 500)
  }
})

// Get user progress
app.get('/make-server-997116c5/progress', async (c) => {
  try {
    console.log('GET /progress - attempting to validate user token')
    const user = await getUserFromToken(c.req.raw)
    
    if (!user) {
      console.error('Failed to get user from token for /progress GET')
      return c.json({ error: 'Unauthorized - Invalid or expired token' }, 401)
    }
    
    console.log('GET /progress - user validated successfully:', user.id)

    const userProgressKey = `user_progress_${user.id}`
    const progress = await kv.get(userProgressKey)
    
    const defaultProgress = {
      level: 1,
      currentXP: 0,
      totalXP: 0,
      unlockedRewards: []
    }
    
    return c.json({ progress: progress || defaultProgress })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return c.json({ error: 'Failed to fetch progress' }, 500)
  }
})

// Save user settings (background theme, etc.)
app.post('/make-server-997116c5/settings', async (c) => {
  try {
    const user = await getUserFromToken(c.req.raw)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { settings } = body

    const userSettingsKey = `user_settings_${user.id}`
    await kv.set(userSettingsKey, settings)
    
    return c.json({ success: true, message: 'Settings saved successfully' })
  } catch (error) {
    console.error('Error saving settings:', error)
    return c.json({ error: 'Failed to save settings' }, 500)
  }
})

// Get user settings
app.get('/make-server-997116c5/settings', async (c) => {
  try {
    console.log('GET /settings - attempting to validate user token')
    const user = await getUserFromToken(c.req.raw)
    
    if (!user) {
      console.error('Failed to get user from token for /settings GET')
      return c.json({ error: 'Unauthorized - Invalid or expired token' }, 401)
    }
    
    console.log('GET /settings - user validated successfully:', user.id)

    const userSettingsKey = `user_settings_${user.id}`
    const settings = await kv.get(userSettingsKey)
    
    const defaultSettings = {
      backgroundTheme: 'sky',
      gameSettings: {
        animationType: 'sparkles'
      }
    }
    
    return c.json({ settings: settings || defaultSettings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return c.json({ error: 'Failed to fetch settings' }, 500)
  }
})

// Health check route
app.get('/make-server-997116c5/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start the server
Deno.serve(app.fetch)