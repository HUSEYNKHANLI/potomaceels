import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = '';
    try {
      // Try to parse as JSON first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || res.statusText;
      } else {
        // If not JSON, get as text
        const text = await res.text();
        // If it's HTML, provide a more user-friendly message
        if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
          errorMessage = `Server error (${res.status}). The server might be unavailable or misconfigured.`;
        } else {
          errorMessage = text || res.statusText;
        }
      }
    } catch (e) {
      errorMessage = `Error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json"
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        headers: {
          "Accept": "application/json"
        },
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      try {
        return await res.json();
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
        throw new Error('Server returned an invalid response format');
      }
    } catch (error) {
      console.error('Query function failed:', error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
