export function validateBitcoinAddress(address: string): boolean {
  // Comprehensive Bitcoin address validation for all address types
  
  // Legacy P2PKH (starts with 1)
  const p2pkhMainnet = /^[1][a-km-z1-9A-HJ-NP-Z]{25,34}$/;
  const p2pkhTestnet = /^[mn][a-km-z1-9A-HJ-NP-Z]{25,34}$/;
  
  // Legacy P2SH (starts with 3)
  const p2shMainnet = /^[3][a-km-z1-9A-HJ-NP-Z]{25,34}$/;
  const p2shTestnet = /^[2][a-km-z1-9A-HJ-NP-Z]{25,34}$/;
  
  // Bech32 SegWit v0 (P2WPKH and P2WSH)
  const segwitMainnet = /^bc1[a-z0-9]{39,59}$/;
  const segwitTestnet = /^tb1[a-z0-9]{39,59}$/;
  
  // Bech32m Taproot (P2TR - SegWit v1)
  const taprootMainnet = /^bc1p[a-z0-9]{58}$/;
  const taprootTestnet = /^tb1p[a-z0-9]{58}$/;
  
  return p2pkhMainnet.test(address) || 
         p2pkhTestnet.test(address) ||
         p2shMainnet.test(address) || 
         p2shTestnet.test(address) ||
         segwitMainnet.test(address) || 
         segwitTestnet.test(address) ||
         taprootMainnet.test(address) || 
         taprootTestnet.test(address);
}

export function validateTransactionHash(hash: string): boolean {
  // Validate 64-character hexadecimal transaction hash
  const hashRegex = /^[a-fA-F0-9]{64}$/;
  return hashRegex.test(hash);
}

export function validateRawTransaction(rawTx: string): boolean {
  // Validate hexadecimal raw transaction data
  // Bitcoin transactions are variable length but must be valid hex and at least 60 bytes (120 hex chars)
  const hexRegex = /^[a-fA-F0-9]+$/;
  return hexRegex.test(rawTx) && rawTx.length >= 120 && rawTx.length % 2 === 0;
}

export function parseRawTransaction(rawTx: string): { txid: string; locktime: number; outputs: Array<{ value: number; address?: string }>; totalOutputValue?: number } | null {
  try {
    if (!validateRawTransaction(rawTx)) {
      return null;
    }

    const data = rawTx.toLowerCase();
    
    // Parse locktime from the last 4 bytes (8 hex chars) - little endian
    const locktimeHex = data.slice(-8);
    const locktimeBytes = locktimeHex.match(/../g)?.reverse().join('') || '';
    const locktime = parseInt(locktimeBytes, 16);
    
    // Debug for development - can be removed in production
    if (process.env.NODE_ENV === 'development') {
      console.log("Transaction locktime parsed:", locktime, locktime > 500000000 ? "(timestamp)" : "(block height)");
    }
    

    
    // Parse transaction outputs to extract amounts
    const outputs: Array<{ value: number; address?: string }> = [];
    let totalOutputValue = 0;
    
    // More precise parsing: Look for output section after inputs
    // Bitcoin tx format: version(4) + input_count + inputs + output_count + outputs + locktime(4)
    
    // Skip version (8 hex chars)
    let offset = 8;
    
    // Skip input count and inputs - look for output section by finding patterns
    // Outputs typically have: value(8 bytes) + script_length(1-9 bytes) + script
    
    // Look for likely output value patterns - very small amounts in satoshis
    const potentialOutputValues: number[] = [];
    
    // Scan for patterns that look like output values (8-byte little-endian)
    // Focus on smaller values that are more likely to be actual outputs
    for (let i = 16; i < data.length - 24; i += 2) { // Start after version, stop before locktime
      const valueHex = data.substr(i, 16);
      if (/^[0-9a-f]{16}$/.test(valueHex)) {
        // Convert from little-endian
        const bytes = valueHex.match(/../g);
        if (bytes) {
          const reversedHex = bytes.reverse().join('');
          const value = parseInt(reversedHex, 16);
          
          // Look for reasonable Bitcoin amounts (dust to large transactions)
          if (value > 0 && value <= 21000000 * 100000000) { // Up to 21M BTC in satoshis
            // Check if this could be followed by a script length byte
            const nextByte = data.substr(i + 16, 2);
            const nextByteVal = parseInt(nextByte, 16);
            
            // Script length is typically 0x19 (25) for P2PKH, 0x17 (23) for P2SH, etc.
            if (nextByteVal > 0 && nextByteVal < 100) {
              potentialOutputValues.push(value);
            }
          }
        }
      }
    }
    
    if (potentialOutputValues.length > 0) {
      // Remove duplicate values and filter out unreasonable amounts
      const uniqueValues = Array.from(new Set(potentialOutputValues));
      const filtered = uniqueValues.filter(v => 
        v !== locktime && // Not the locktime value
        v > 0 && 
        v <= 21000000 * 100000000 // Reasonable BTC range
      );
      
      if (filtered.length > 0) {
        // For most transactions, take the largest reasonable output value
        // (main recipient), but if all values are very small, take the first one
        const maxValue = Math.max(...filtered);
        totalOutputValue = maxValue > 100000 ? maxValue : filtered[0]; // 0.001 BTC threshold
        outputs.push({ value: totalOutputValue });
      }
    }
    
    // Generate transaction ID based on the hex data
    const txid = `parsed_${data.slice(0, 12)}...${data.slice(-16, -8)}`;

    return {
      txid,
      locktime,
      outputs,
      totalOutputValue
    };
   } catch (error) {
    console.error('Failed to parse raw transaction:', error);
    return null;
  }
}

export function formatBitcoinAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(8);
}

export function calculateTimeRemaining(unlockDate: Date): string {
  const now = new Date();
  const diff = unlockDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return "Ready to unlock";
  }
  
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) {
    const remainingMonths = Math.floor((days % 365) / 30);
    return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  } else if (months > 0) {
    const remainingDays = days % 30;
    return `${months} month${months > 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
  } else if (days > 0) {
    const remainingHours = totalHours % 24;
    if (remainingHours > 0) {
      return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
    }
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (totalHours > 0) {
    const remainingMinutes = totalMinutes % 60;
    if (remainingMinutes > 0 && totalHours < 24) {
      return `${totalHours} hour${totalHours !== 1 ? 's' : ''}, ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    }
    return `${totalHours} hour${totalHours !== 1 ? 's' : ''}`;
  } else {
    return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  }
}

// Bitcoin API integration
interface AddressInfo {
  address: string;
  balance: number;
  received: number;
  spent: number;
  tx_count: number;
}

interface UTXOInfo {
  txid: string;
  vout: number;
  value: number;
  confirmed: boolean;
}

export class BitcoinAPI {
  private static primaryAPI = 'https://blockstream.info/api';
  private static backupAPI = 'https://api.blockcypher.com/v1/btc/main';
  
  static async getAddressInfo(address: string): Promise<AddressInfo | null> {
    try {
      // Try Blockstream API first
      const response = await fetch(`${this.primaryAPI}/address/${address}`);
      if (response.ok) {
        const data = await response.json();
        return {
          address,
          balance: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
          received: data.chain_stats.funded_txo_sum,
          spent: data.chain_stats.spent_txo_sum,
          tx_count: data.chain_stats.tx_count
        };
      }
    } catch (error) {
      console.warn('Blockstream API failed, trying backup API');
    }

    try {
      // Fallback to BlockCypher API
      const response = await fetch(`${this.backupAPI}/addrs/${address}/balance`);
      if (response.ok) {
        const data = await response.json();
        return {
          address,
          balance: data.balance,
          received: data.total_received,
          spent: data.total_sent,
          tx_count: data.n_tx
        };
      }
    } catch (error) {
      console.error('Both APIs failed:', error);
    }

    return null;
  }

  static async getAddressUTXOs(address: string): Promise<UTXOInfo[]> {
    try {
      // Try Blockstream API first
      const response = await fetch(`${this.primaryAPI}/address/${address}/utxo`);
      if (response.ok) {
        const data = await response.json();
        return data.map((utxo: any) => ({
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          confirmed: utxo.status.confirmed
        }));
      }
    } catch (error) {
      console.warn('Blockstream UTXO API failed, trying backup');
    }

    try {
      // Fallback to BlockCypher API
      const response = await fetch(`${this.backupAPI}/addrs/${address}?unspentOnly=true`);
      if (response.ok) {
        const data = await response.json();
        return (data.txrefs || []).map((utxo: any) => ({
          txid: utxo.tx_hash,
          vout: utxo.tx_output_n,
          value: utxo.value,
          confirmed: utxo.confirmations > 0
        }));
      }
    } catch (error) {
      console.error('Both UTXO APIs failed:', error);
    }

    return [];
  }

  static satoshisToBTC(satoshis: number): string {
    return (satoshis / 100000000).toFixed(8);
  }

  // Broadcast raw transaction to Bitcoin network
  static async broadcastTransaction(rawTransactionHex: string): Promise<{ success: boolean; txid?: string; error?: string }> {
    try {
      // Try Blockstream API first
      const response = await fetch(`${this.primaryAPI}/tx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: rawTransactionHex
      });

      if (response.ok) {
        const txid = await response.text();
        return { success: true, txid: txid.trim() };
      } else {
        const errorText = await response.text();
        
        // Handle specific Bitcoin network errors with user-friendly messages
        if (errorText.includes('dust')) {
          return { 
            success: false, 
            error: `Transaction rejected: Output amount (${errorText.match(/\d+/)?.[0] || 'unknown'} satoshis) is below Bitcoin's dust threshold (546 satoshis). Bitcoin network rejects transactions with very small outputs to prevent spam. Please use a transaction with outputs of at least 546 satoshis (0.00000546 BTC).`
          };
        } else if (errorText.includes('insufficient fee')) {
          return { 
            success: false, 
            error: `Transaction rejected: Insufficient transaction fee. Please ensure your transaction includes an adequate fee for current network conditions.`
          };
        } else if (errorText.includes('already in blockchain')) {
          return { 
            success: false, 
            error: `Transaction already exists in the blockchain. This transaction has already been broadcast and confirmed.`
          };
        } else {
          return { success: false, error: `Blockstream API error: ${errorText}` };
        }
      }
    } catch (error) {
      console.error('Blockstream broadcast failed:', error);
      
      try {
        // Fallback to BlockCypher API
        const response = await fetch(`${this.backupAPI}/txs/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tx: rawTransactionHex })
        });

        if (response.ok) {
          const data = await response.json();
          return { success: true, txid: data.tx.hash };
        } else {
          const errorData = await response.json();
          
          // Handle specific errors from BlockCypher too
          if (errorData.error && errorData.error.includes('dust')) {
            return { 
              success: false, 
              error: `Transaction rejected: Output amount is below Bitcoin's dust threshold (546 satoshis). Please use a transaction with outputs of at least 546 satoshis (0.00000546 BTC).`
            };
          } else {
            return { success: false, error: `BlockCypher API error: ${errorData.error}` };
          }
        }
      } catch (backupError) {
        console.error('Both broadcast APIs failed:', backupError);
        return { success: false, error: 'Failed to broadcast transaction - all APIs unavailable' };
      }
    }
  }

  static async getBTCPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      if (response.ok) {
        const data = await response.json();
        return data.bitcoin.usd;
      }
    } catch (error) {
      console.error('Failed to fetch BTC price:', error);
    }
    return 0;
  }
}

// Transaction information interface
interface TransactionInfo {
  txid: string;
  locktime: number;
  unlockDate: Date | null;
  totalOutputAmount: number; // in satoshis
  fee: number; // in satoshis
  confirmed: boolean;
  status: 'confirmed' | 'unconfirmed' | 'not_found';
}

// Add transaction fetching to BitcoinAPI
class TransactionAPI {
  private static primaryAPI = 'https://blockstream.info/api';
  private static backupAPI = 'https://api.blockcypher.com/v1/btc/main';

  static async getTransactionInfo(txid: string): Promise<TransactionInfo | null> {
    try {
      // Try Blockstream API first
      const response = await fetch(`${this.primaryAPI}/tx/${txid}`);
      if (response.ok) {
        const data = await response.json();
        
        // Calculate total output amount
        const totalOutputAmount = data.vout.reduce((sum: number, output: any) => sum + output.value, 0);
        
        // Decode locktime to unlock date
        const unlockDate = this.decodeLocktime(data.locktime);
        
        // Get transaction status
        const statusResponse = await fetch(`${this.primaryAPI}/tx/${txid}/status`);
        const statusData = statusResponse.ok ? await statusResponse.json() : null;
        
        return {
          txid: data.txid,
          locktime: data.locktime,
          unlockDate,
          totalOutputAmount,
          fee: data.fee,
          confirmed: statusData?.confirmed || false,
          status: statusData?.confirmed ? 'confirmed' : 'unconfirmed'
        };
      }
    } catch (error) {
      console.warn('Blockstream transaction API failed, trying backup API');
    }

    try {
      // Fallback to BlockCypher API
      const response = await fetch(`${this.backupAPI}/txs/${txid}`);
      if (response.ok) {
        const data = await response.json();
        
        // Calculate total output amount
        const totalOutputAmount = data.outputs.reduce((sum: number, output: any) => sum + output.value, 0);
        
        // BlockCypher doesn't provide locktime in the same way, so we can't decode it
        // We'll mark it as unknown for backup API
        
        return {
          txid: data.hash,
          locktime: data.lock_time || 0,
          unlockDate: data.lock_time ? this.decodeLocktime(data.lock_time) : null,
          totalOutputAmount,
          fee: data.fees,
          confirmed: data.confirmations > 0,
          status: data.confirmations > 0 ? 'confirmed' : 'unconfirmed'
        };
      }
    } catch (error) {
      console.error('Both transaction APIs failed:', error);
    }

    return null;
  }

  private static decodeLocktime(locktime: number): Date | null {
    if (locktime === 0) {
      return null; // No timelock
    } else if (locktime < 500000000) {
      // Block height - we can't convert this to exact date without more API calls
      // For now, return null and let user know it's block-height based
      return null;
    } else {
      // Unix timestamp
      return new Date(locktime * 1000);
    }
  }

  static formatLocktime(locktime: number): string {
    if (locktime === 0) {
      return "No timelock - can be broadcast immediately";
    } else if (locktime < 500000000) {
      return `Locked until block ${locktime}`;
    } else {
      const date = new Date(locktime * 1000);
      return `Locked until ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
  }
}

// Broadcasting API for signed transactions
class BroadcastAPI {
  private static primaryAPI = 'https://blockstream.info/api';
  private static backupAPI = 'https://api.blockcypher.com/v1/btc/main';

  static async broadcastTransaction(rawTxHex: string): Promise<{ success: boolean; txid?: string; error?: string }> {
    try {
      // Try Blockstream API first
      const response = await fetch(`${this.primaryAPI}/tx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: rawTxHex
      });

      if (response.ok) {
        const txid = await response.text();
        return { success: true, txid: txid.trim() };
      } else {
        const errorText = await response.text();
        console.warn('Blockstream broadcast failed:', errorText);
        
        // Try backup API
        return await this.broadcastViaBackupAPI(rawTxHex);
      }
    } catch (error) {
      console.warn('Blockstream broadcast error:', error);
      
      // Try backup API
      return await this.broadcastViaBackupAPI(rawTxHex);
    }
  }

  private static async broadcastViaBackupAPI(rawTxHex: string): Promise<{ success: boolean; txid?: string; error?: string }> {
    try {
      // BlockCypher API requires JSON format
      const response = await fetch(`${this.backupAPI}/txs/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tx: rawTxHex })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, txid: data.hash };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error?.message || 'Broadcast failed via backup API' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Both broadcast APIs failed: ${error}` 
      };
    }
  }

  static async checkTransactionStatus(txid: string): Promise<{ confirmed: boolean; confirmations: number }> {
    try {
      const response = await fetch(`${this.primaryAPI}/tx/${txid}/status`);
      if (response.ok) {
        const data = await response.json();
        return {
          confirmed: data.confirmed || false,
          confirmations: data.block_height ? (data.block_height - data.block_height + 1) : 0
        };
      }
    } catch (error) {
      console.error('Failed to check transaction status:', error);
    }
    
    return { confirmed: false, confirmations: 0 };
  }
}

export { TransactionAPI, BroadcastAPI, type AddressInfo, type UTXOInfo, type TransactionInfo };
