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
    
    // Extract method and body from options
    const { method = 'GET', body, headers, ...restOptions } = options;
    
    // Only include body if method is not GET/HEAD
    const requestOptions: RequestInit = {
      method,
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    // Only add body if method allows it
    if (body && method !== 'GET' && method !== 'HEAD') {
      requestOptions.body = body;
    }
    
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      // Handle network errors (API route not found/not accessible)
      if (response.status === 404 || response.status === 0) {
        throw new Error(
          'API endpoint not found. Make sure you are running with "vercel dev" for local development, or that the API routes are deployed correctly.'
        );
      }
      
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
      
      // Build request options explicitly
      const requestOptions: RequestInit = {
        method,
      };
      
      // Only add body if method allows it
      if (body && method !== 'GET' && method !== 'HEAD') {
        requestOptions.body = JSON.stringify(body);
      }
      
      const response = await this.request<T>(`/${functionName}`, requestOptions);

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
      // If response has a data property, return it directly
      // Otherwise return the whole response
      const data = response.data !== undefined ? response.data : response;
      return { 
        data: data as T, 
        error: null 
      };
    } catch (error) {
      // Handle fetch errors (network issues, CORS, etc.)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error';
      
      // Check if it's a network error
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        return {
          data: null,
          error: { 
            message: 'Cannot connect to API. If running locally, use "vercel dev" instead of "npm run dev". If deployed, check that environment variables are set in Vercel dashboard.'
          },
        };
      }
      
      return {
        data: null,
        error: { message: errorMessage },
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
