import { QueryClient } from "@tanstack/react-query";
import { LocalStorage } from "./localStorage";
import { BitcoinAPI } from "./bitcoin";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Handle localStorage-based operations
  if (url.startsWith("/api/")) {
    return handleLocalStorageOperation(method, url, data);
  }
  
  // Handle external API calls
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

async function handleLocalStorageOperation(
  method: string,
  url: string,
  data?: any
): Promise<Response> {
  try {
    let result: any;
    
    // Watch Addresses
    if (url === "/api/watch-addresses") {
      if (method === "POST") {
        const newAddress = LocalStorage.addWatchAddress(data);
        
        // Fetch real Bitcoin data
        try {
          const addressInfo = await BitcoinAPI.getAddressInfo(newAddress.address);
          if (addressInfo) {
            const btcPrice = await BitcoinAPI.getBTCPrice();
            const balanceBTC = BitcoinAPI.satoshisToBTC(addressInfo.balance);
            const balanceUSD = btcPrice > 0 ? (parseFloat(balanceBTC) * btcPrice).toFixed(2) : "0";
            
            LocalStorage.updateWatchAddress(newAddress.id, {
              balance: balanceBTC,
              balanceUsd: balanceUSD
            });
            
            result = { ...newAddress, balance: balanceBTC, balanceUsd: balanceUSD };
          } else {
            result = newAddress;
          }
        } catch (error) {
          console.warn("Failed to fetch real Bitcoin data:", error);
          result = newAddress;
        }
      }
    }
    
    // Watch Address deletion
    else if (url.match(/^\/api\/watch-addresses\/(.+)$/)) {
      const id = url.split('/').pop()!;
      if (method === "DELETE") {
        const success = LocalStorage.deleteWatchAddress(id);
        result = success ? {} : null;
      }
    }
    
    // Time Locked Transactions
    else if (url === "/api/time-locked-transactions") {
      if (method === "POST") {
        result = LocalStorage.addTimeLockedTransaction(data);
      }
    }
    
    // Time Locked Transaction operations
    else if (url.match(/^\/api\/time-locked-transactions\/(.+)$/)) {
      const pathParts = url.split('/');
      const id = pathParts[pathParts.length - 2];
      
      if (url.endsWith('/broadcast') && method === "PATCH") {
        result = LocalStorage.updateTimeLockedTransaction(id, { 
          status: "BROADCASTED", 
          isReady: true 
        });
      } else if (method === "DELETE") {
        const success = LocalStorage.deleteTimeLockedTransaction(id);
        result = success ? {} : null;
      }
    }
    
    // Estate Instructions
    else if (url === "/api/estate-instructions") {
      if (method === "POST") {
        result = LocalStorage.addEstateInstruction(data);
      }
    }
    
    // Estate Instruction operations
    else if (url.match(/^\/api\/estate-instructions\/(.+)$/)) {
      const id = url.split('/').pop()!;
      
      if (method === "PATCH") {
        result = LocalStorage.updateEstateInstruction(id, data);
      } else if (method === "DELETE") {
        const success = LocalStorage.deleteEstateInstruction(id);
        result = success ? {} : null;
      }
    }
    
    // Create mock Response object
    if (result !== undefined) {
      return new Response(JSON.stringify(result), {
        status: result === null ? 404 : (method === "POST" ? 201 : 200),
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(null, { status: 404 });
    
  } catch (error) {
    console.error("LocalStorage operation failed:", error);
    return new Response(JSON.stringify({ error: "Operation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        
        // Handle localStorage-based queries
        if (url === "/api/watch-addresses") {
          LocalStorage.updateTransactionStatuses();
          return LocalStorage.getWatchAddresses();
        }
        
        if (url === "/api/time-locked-transactions") {
          LocalStorage.updateTransactionStatuses();
          return LocalStorage.getTimeLockedTransactions();
        }
        
        if (url === "/api/estate-instructions") {
          return LocalStorage.getEstateInstructions();
        }
        
        // External API calls
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      },
      refetchInterval: 30000, // Auto-refresh every 30 seconds
      refetchOnWindowFocus: true,
      staleTime: 10000, // 10 seconds
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
