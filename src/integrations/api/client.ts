/**
 * API Client - Replaces Supabase Edge Functions
 * Uses Vercel Serverless Functions
 */

import { authHeaders, reportUnauthorized } from '@/lib/api';

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
    
    // Attach the caller's session token (and admin-mode token, when admin
    // mode is on) automatically so every route that requires auth (see
    // api/_lib/auth.ts) works without every call site having to remember
    // to add the headers itself.
    const identity: Record<string, string> = typeof window !== 'undefined' ? authHeaders() : {};

    // Only include body if method is not GET/HEAD
    const requestOptions: RequestInit = {
      method,
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...identity,
        ...headers,
      },
    };
    
    // Only add body if method allows it
    if (body && method !== 'GET' && method !== 'HEAD') {
      requestOptions.body = body;
    }
    
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      // A 401 on a request that carried a session means the session has ended.
      if (response.status === 401 && identity['Authorization']) reportUnauthorized();
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      // Prefer the server's explanation (written for people) over its error code.
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
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
      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }
      
      const response = await this.request<T>(`/${functionName}`, requestOptions);

      // Handle error response
      if (response.error) {
        return { 
          data: null, 
          error: typeof response.error === 'string' 
            ? { message: typeof response.message === 'string' ? response.message : response.error } 
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
