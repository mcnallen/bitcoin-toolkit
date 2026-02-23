import type { WatchAddress, TimeLockedTransaction, EstateInstruction } from "@shared/schema";

const STORAGE_KEYS = {
  WATCH_ADDRESSES: "timelocked_watch_addresses",
  TIME_LOCKED_TRANSACTIONS: "timelocked_timelock_transactions", 
  ESTATE_INSTRUCTIONS: "timelocked_estate_instructions",
} as const;

// Watch Addresses
export const watchAddressStorage = {
  getAll(): WatchAddress[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WATCH_ADDRESSES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error reading watch addresses from localStorage:", error);
      return [];
    }
  },

  save(addresses: WatchAddress[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WATCH_ADDRESSES, JSON.stringify(addresses));
    } catch (error) {
      console.error("Error saving watch addresses to localStorage:", error);
    }
  },

  add(address: Omit<WatchAddress, "id" | "addedDate">): WatchAddress {
    const addresses = this.getAll();
    const newAddress: WatchAddress = {
      ...address,
      id: crypto.randomUUID(),
      addedDate: new Date(),
    };
    addresses.push(newAddress);
    this.save(addresses);
    return newAddress;
  },

  delete(id: string): void {
    const addresses = this.getAll().filter(addr => addr.id !== id);
    this.save(addresses);
  },

  update(id: string, updates: Partial<WatchAddress>): WatchAddress | null {
    const addresses = this.getAll();
    const index = addresses.findIndex(addr => addr.id === id);
    if (index === -1) return null;
    
    addresses[index] = { ...addresses[index], ...updates };
    this.save(addresses);
    return addresses[index];
  }
};

// Time-Locked Transactions
export const timeLockedTransactionStorage = {
  getAll(currentBlockHeight?: number): TimeLockedTransaction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TIME_LOCKED_TRANSACTIONS);
      const transactions = stored ? JSON.parse(stored) : [];
      
      // Convert date strings back to Date objects and update status
      return transactions.map((tx: any) => {
        // Calculate isReady status based on transaction type
        let isReady = false;
        if (tx.unlockBlockHeight && currentBlockHeight !== undefined) {
          // Block height locktime - check if current block height reached
          isReady = tx.unlockBlockHeight <= currentBlockHeight;
        } else if (tx.unlockDate) {
          // Timestamp locktime - check if unlock date passed
          isReady = new Date(tx.unlockDate) <= new Date();
        }
        
        return {
          ...tx,
          unlockDate: tx.unlockDate ? new Date(tx.unlockDate) : undefined,
          createdDate: new Date(tx.createdDate),
          lastBroadcastAttempt: tx.lastBroadcastAttempt ? new Date(tx.lastBroadcastAttempt) : null,
          isReady,
        };
      });
    } catch (error) {
      console.error("Error reading time-locked transactions from localStorage:", error);
      return [];
    }
  },

  save(transactions: TimeLockedTransaction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TIME_LOCKED_TRANSACTIONS, JSON.stringify(transactions));
    } catch (error) {
      console.error("Error saving time-locked transactions to localStorage:", error);
    }
  },

  add(transaction: { 
    transactionHash: string;
    unlockDate?: Date;
    unlockBlockHeight?: number;
    amount: string;
    description: string;
    rawTransactionHex: string;
    status: string;
    broadcastAttempts: string;
    lastBroadcastAttempt: Date | null;
    fromAddress?: string;
    toAddress?: string;
  }): TimeLockedTransaction {
    const transactions = this.getAll(); // Don't pass block height here for basic fetch
    const newTransaction: TimeLockedTransaction = {
      ...transaction,
      unlockDate: transaction.unlockDate || null,
      unlockBlockHeight: transaction.unlockBlockHeight || null,
      fromAddress: transaction.fromAddress || null,
      toAddress: transaction.toAddress || null,
      id: crypto.randomUUID(),
      createdDate: new Date(),
      isReady: transaction.unlockDate ? transaction.unlockDate <= new Date() : false,
    };
    transactions.push(newTransaction);
    this.save(transactions);
    return newTransaction;
  },

  delete(id: string): void {
    const transactions = this.getAll().filter(tx => tx.id !== id);
    this.save(transactions);
  },

  update(id: string, updates: { 
    transactionHash?: string;
    unlockDate?: Date;
    unlockBlockHeight?: number;
    amount?: string;
    description?: string;
    rawTransactionHex?: string;
    status?: string;
    broadcastAttempts?: string;
    lastBroadcastAttempt?: Date | null;
    fromAddress?: string;
    toAddress?: string;
    isReady?: boolean;
  }): TimeLockedTransaction | null {
    const transactions = this.getAll();
    const index = transactions.findIndex(tx => tx.id === id);
    if (index === -1) return null;
    
    transactions[index] = { 
      ...transactions[index], 
      ...updates,
      // Ensure dates are properly handled
      unlockDate: updates.unlockDate ? new Date(updates.unlockDate) : transactions[index].unlockDate,
      lastBroadcastAttempt: updates.lastBroadcastAttempt ? new Date(updates.lastBroadcastAttempt) : transactions[index].lastBroadcastAttempt,
      fromAddress: updates.fromAddress || transactions[index].fromAddress,
      toAddress: updates.toAddress || transactions[index].toAddress,
    };
    this.save(transactions);
    return transactions[index];
  },

  getReadyToBroadcast(): TimeLockedTransaction[] {
    return this.getAll().filter(tx => 
      tx.isReady && 
      tx.status !== "BROADCASTED" && 
      tx.rawTransactionHex
    );
  }
};

// Estate Instructions
export const estateInstructionStorage = {
  getAll(): EstateInstruction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ESTATE_INSTRUCTIONS);
      const instructions = stored ? JSON.parse(stored) : [];
      
      // Convert date strings back to Date objects
      return instructions.map((instruction: any) => ({
        ...instruction,
        lastUpdated: new Date(instruction.lastUpdated),
      }));
    } catch (error) {
      console.error("Error reading estate instructions from localStorage:", error);
      return [];
    }
  },

  save(instructions: EstateInstruction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ESTATE_INSTRUCTIONS, JSON.stringify(instructions));
    } catch (error) {
      console.error("Error saving estate instructions to localStorage:", error);
    }
  },

  add(instruction: Omit<EstateInstruction, "id" | "lastUpdated">): EstateInstruction {
    const instructions = this.getAll();
    const newInstruction: EstateInstruction = {
      ...instruction,
      id: crypto.randomUUID(),
      lastUpdated: new Date(),
    };
    instructions.push(newInstruction);
    this.save(instructions);
    return newInstruction;
  },

  delete(id: string): void {
    const instructions = this.getAll().filter(inst => inst.id !== id);
    this.save(instructions);
  },

  update(id: string, updates: Partial<EstateInstruction>): EstateInstruction | null {
    const instructions = this.getAll();
    const index = instructions.findIndex(inst => inst.id === id);
    if (index === -1) return null;
    
    instructions[index] = { 
      ...instructions[index], 
      ...updates,
      lastUpdated: new Date(),
    };
    this.save(instructions);
    return instructions[index];
  }
};

// Compatibility export for existing code
export const LocalStorage = {
  // Watch addresses
  getWatchAddresses: () => watchAddressStorage.getAll(),
  addWatchAddress: (address: Omit<WatchAddress, "id" | "addedDate">) => watchAddressStorage.add(address),
  updateWatchAddress: (id: string, updates: Partial<WatchAddress>) => watchAddressStorage.update(id, updates),
  deleteWatchAddress: (id: string) => { watchAddressStorage.delete(id); return true; },

  // Time-locked transactions  
  getTimeLockedTransactions: () => timeLockedTransactionStorage.getAll(),
  addTimeLockedTransaction: (transaction: any) => timeLockedTransactionStorage.add(transaction),
  updateTimeLockedTransaction: (id: string, updates: any) => timeLockedTransactionStorage.update(id, updates),
  deleteTimeLockedTransaction: (id: string) => { timeLockedTransactionStorage.delete(id); return true; },

  // Estate instructions
  getEstateInstructions: () => estateInstructionStorage.getAll(),
  addEstateInstruction: (instruction: Omit<EstateInstruction, "id" | "lastUpdated">) => estateInstructionStorage.add(instruction),
  updateEstateInstruction: (id: string, updates: Partial<EstateInstruction>) => estateInstructionStorage.update(id, updates),
  deleteEstateInstruction: (id: string) => { estateInstructionStorage.delete(id); return true; },

  // Utility methods
  updateTransactionStatuses: () => {
    // Update transaction readiness status
    const transactions = timeLockedTransactionStorage.getAll();
    transactions.forEach(tx => {
      // Only check timestamp locktimes, block height ones need current block info
      const isReady = tx.unlockDate ? tx.unlockDate <= new Date() : false;
      if (tx.isReady !== isReady) {
        timeLockedTransactionStorage.update(tx.id, { isReady });
      }
    });
  }
};