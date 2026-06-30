import { publicAnonKey } from './supabase/info';

const API_BASE = 'https://popple-api.johanna-huarachi.workers.dev';

// Get the current access token from Supabase auth
const getAccessToken = async () => {
  // This will be called from components that have access to supabase client
  // For now, we'll handle it in the calling component
  return null;
};

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generic API call function with retry logic
const apiCall = async <T = any>(
  endpoint: string, 
  options: RequestInit = {},
  accessToken?: string,
  retryCount: number = 0
): Promise<ApiResponse<T>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    // Add authorization header if access token is provided
    if (accessToken) {
      console.log('Using access token for API call to:', endpoint, 'token starts with:', accessToken.substring(0, 20) + '...');
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      console.log('Using public anon key for API call to:', endpoint);
      headers['Authorization'] = `Bearer ${publicAnonKey}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`API Error (${response.status}) for ${endpoint}:`, data);
      console.error('Request headers:', headers);
      
      // If it's a 401 and we have retries left, log for debugging but don't retry auth errors
      if (response.status === 401) {
        console.error('Authentication failed - token may be invalid or expired');
        return { error: `Authentication failed: ${data.error || 'Invalid or expired token'}` };
      }
      
      return { error: data.error || `HTTP ${response.status}` };
    }

    return { success: true, data };
  } catch (error) {
    console.error('API call failed:', error);
    
    // Retry on network errors (but not auth errors)
    if (retryCount < 2) {
      console.log(`Retrying API call to ${endpoint} (attempt ${retryCount + 2}/3)`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return apiCall(endpoint, options, accessToken, retryCount + 1);
    }
    
    return { error: 'Network error occurred after retries' };
  }
};

// Task management API functions
export const taskApi = {
  // Get user's tasks
  getTasks: async (accessToken: string) => {
    const response = await apiCall('/tasks', { method: 'GET' }, accessToken);
    return response.data?.tasks || [];
  },

  // Save user's tasks
  saveTasks: async (tasks: any[], accessToken: string) => {
    const response = await apiCall('/tasks', {
      method: 'POST',
      body: JSON.stringify({ tasks })
    }, accessToken);
    return response;
  }
};

// Progress management API functions
export const progressApi = {
  // Get user's progress
  getProgress: async (accessToken: string) => {
    const response = await apiCall('/progress', { method: 'GET' }, accessToken);
    return response.data?.progress || {
      level: 1,
      currentXP: 0,
      totalXP: 0,
      unlockedRewards: []
    };
  },

  // Save user's progress
  saveProgress: async (progress: any, accessToken: string) => {
    const response = await apiCall('/progress', {
      method: 'POST',
      body: JSON.stringify({ progress })
    }, accessToken);
    return response;
  }
};

// Settings management API functions
export const settingsApi = {
  // Get user's settings
  getSettings: async (accessToken: string) => {
    const response = await apiCall('/settings', { method: 'GET' }, accessToken);
    return response.data?.settings || {
      backgroundTheme: 'sky',
      gameSettings: {
        animationType: 'sparkles'
      }
    };
  },

  // Save user's settings
  saveSettings: async (settings: any, accessToken: string) => {
    const response = await apiCall('/settings', {
      method: 'POST',
      body: JSON.stringify({ settings })
    }, accessToken);
    return response;
  }
};

// Health check
export const healthCheck = async () => {
  const response = await apiCall('/health', { method: 'GET' });
  return response;
};