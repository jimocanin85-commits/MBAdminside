/**
 * API Client - Replaces Supabase Edge Functions
 * Uses Vercel Serverless Functions
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Invoke an API function (replaces supabase.functions.invoke)
   */
  async invoke<T = any>(
    functionName: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
    } = {}
  ): Promise<{ data: T; error: null } | { data: null; error: any }> {
    try {
      const { method = 'GET', body } = options;
      
      const response = await this.request<T>(`/${functionName}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle error response
      if (response.error) {
        return { 
          data: null, 
          error: typeof response.error === 'string' 
            ? { message: response.error } 
            : response.error 
        };
      }

      // Return data in same format as Supabase
      return { 
        data: (response.data !== undefined ? response.data : response) as T, 
        error: null 
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error 
          ? { message: error.message } 
          : { message: 'Unknown error' },
      };
    }
  }
}

export const apiClient = new ApiClient();

// Export for backward compatibility (similar to supabase.functions)
export const functions = {
  invoke: <T = any>(
    functionName: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
    } = {}
  ) => apiClient.invoke<T>(functionName, options),
};
