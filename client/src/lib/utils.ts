import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Fetches the current TVL (Total Value Locked) for a protocol from DefiLlama API
 * @param protocol The protocol slug (e.g., 'marinade')
 * @returns The TVL value in USD
 */
export async function fetchProtocolTVL(protocol: string): Promise<number> {
  try {
    const response = await fetch(`https://api.llama.fi/tvl/${protocol}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch TVL for ${protocol}`);
    }
    const tvl = await response.json();
    return Number(tvl);
  } catch (error) {
    console.error(`Error fetching TVL for ${protocol}:`, error);
    return 0;
  }
}

/**
 * Interface for Raydium API response
 */
interface RaydiumInfoResponse {
  tvl: number;
  volume24h: number;
  totalvolume: number;
  [key: string]: any;
}

/**
 * Fetches Raydium protocol information including TVL from their API
 * @returns The Raydium protocol info including TVL, volume, etc.
 */
export async function fetchRaydiumInfo(): Promise<RaydiumInfoResponse> {
  try {
    const response = await fetch('https://api.raydium.io/v2/main/info');
    if (!response.ok) {
      throw new Error('Failed to fetch Raydium info');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Raydium info:', error);
    return { tvl: 0, volume24h: 0, totalvolume: 0 };
  }
}
