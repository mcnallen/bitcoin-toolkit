import { 
  type WatchAddress, 
  type InsertWatchAddress,
  type TimeLockedTransaction,
  type InsertTimeLockedTransaction,
  type EstateInstruction,
  type InsertEstateInstruction
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Watch Addresses
  getWatchAddresses(): Promise<WatchAddress[]>;
  getWatchAddress(id: string): Promise<WatchAddress | undefined>;
  createWatchAddress(address: InsertWatchAddress): Promise<WatchAddress>;
  deleteWatchAddress(id: string): Promise<void>;
  
  // Time Locked Transactions
  getTimeLockedTransactions(): Promise<TimeLockedTransaction[]>;
  getTimeLockedTransaction(id: string): Promise<TimeLockedTransaction | undefined>;
  getReadyToBroadcastTransactions(): Promise<TimeLockedTransaction[]>;
  createTimeLockedTransaction(transaction: InsertTimeLockedTransaction): Promise<TimeLockedTransaction>;
  updateTimeLockedTransactionStatus(id: string, status: string, isReady: boolean, txHash?: string): Promise<TimeLockedTransaction>;
  updateTimeLockedTransactionBroadcastAttempt(id: string, attempts: number): Promise<TimeLockedTransaction>;
  deleteTimeLockedTransaction(id: string): Promise<void>;
  
  // Estate Instructions
  getEstateInstructions(): Promise<EstateInstruction[]>;
  getEstateInstruction(id: string): Promise<EstateInstruction | undefined>;
  createEstateInstruction(instruction: InsertEstateInstruction): Promise<EstateInstruction>;
  updateEstateInstruction(id: string, instruction: Partial<InsertEstateInstruction>): Promise<EstateInstruction>;
  deleteEstateInstruction(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private watchAddresses: Map<string, WatchAddress>;
  private timeLockedTransactions: Map<string, TimeLockedTransaction>;
  private estateInstructions: Map<string, EstateInstruction>;

  constructor() {
    this.watchAddresses = new Map();
    this.timeLockedTransactions = new Map();
    this.estateInstructions = new Map();
  }

  // Watch Addresses
  async getWatchAddresses(): Promise<WatchAddress[]> {
    return Array.from(this.watchAddresses.values());
  }

  async getWatchAddress(id: string): Promise<WatchAddress | undefined> {
    return this.watchAddresses.get(id);
  }

  async createWatchAddress(insertAddress: InsertWatchAddress): Promise<WatchAddress> {
    const id = randomUUID();
    const address: WatchAddress = {
      ...insertAddress,
      id,
      balance: "0",
      balanceUsd: "0",
      addedDate: new Date(),
    };
    this.watchAddresses.set(id, address);
    return address;
  }

  async deleteWatchAddress(id: string): Promise<void> {
    this.watchAddresses.delete(id);
  }

  // Time Locked Transactions
  async getTimeLockedTransactions(): Promise<TimeLockedTransaction[]> {
    return Array.from(this.timeLockedTransactions.values());
  }

  async getTimeLockedTransaction(id: string): Promise<TimeLockedTransaction | undefined> {
    return this.timeLockedTransactions.get(id);
  }

  async getReadyToBroadcastTransactions(): Promise<TimeLockedTransaction[]> {
    const now = new Date();
    return Array.from(this.timeLockedTransactions.values()).filter(tx => {
      const unlockDate = new Date(tx.unlockDate);
      return unlockDate <= now && tx.rawTransactionHex && tx.status !== "BROADCASTED";
    });
  }

  async createTimeLockedTransaction(insertTransaction: InsertTimeLockedTransaction): Promise<TimeLockedTransaction> {
    const id = randomUUID();
    const now = new Date();
    const unlockDate = new Date(insertTransaction.unlockDate);
    const isReady = unlockDate <= now;
    
    const transaction: TimeLockedTransaction = {
      ...insertTransaction,
      id,
      status: isReady ? "READY" : "LOCKED",
      isReady,
      broadcastAttempts: "0",
      lastBroadcastAttempt: null,
      createdDate: now,
    };
    this.timeLockedTransactions.set(id, transaction);
    return transaction;
  }

  async updateTimeLockedTransactionStatus(id: string, status: string, isReady: boolean, txHash?: string): Promise<TimeLockedTransaction> {
    const transaction = this.timeLockedTransactions.get(id);
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    
    const updated = { 
      ...transaction, 
      status, 
      isReady,
      ...(txHash && { transactionHash: txHash })
    };
    this.timeLockedTransactions.set(id, updated);
    return updated;
  }

  async updateTimeLockedTransactionBroadcastAttempt(id: string, attempts: number): Promise<TimeLockedTransaction> {
    const transaction = this.timeLockedTransactions.get(id);
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    
    const updated = { 
      ...transaction, 
      broadcastAttempts: attempts.toString(),
      lastBroadcastAttempt: new Date()
    };
    this.timeLockedTransactions.set(id, updated);
    return updated;
  }

  async deleteTimeLockedTransaction(id: string): Promise<void> {
    this.timeLockedTransactions.delete(id);
  }

  // Estate Instructions
  async getEstateInstructions(): Promise<EstateInstruction[]> {
    return Array.from(this.estateInstructions.values());
  }

  async getEstateInstruction(id: string): Promise<EstateInstruction | undefined> {
    return this.estateInstructions.get(id);
  }

  async createEstateInstruction(insertInstruction: InsertEstateInstruction): Promise<EstateInstruction> {
    const id = randomUUID();
    const instruction: EstateInstruction = {
      ...insertInstruction,
      id,
      lastUpdated: new Date(),
    };
    this.estateInstructions.set(id, instruction);
    return instruction;
  }

  async updateEstateInstruction(id: string, updates: Partial<InsertEstateInstruction>): Promise<EstateInstruction> {
    const instruction = this.estateInstructions.get(id);
    if (!instruction) {
      throw new Error("Instruction not found");
    }
    
    const updated = {
      ...instruction,
      ...updates,
      lastUpdated: new Date(),
    };
    this.estateInstructions.set(id, updated);
    return updated;
  }

  async deleteEstateInstruction(id: string): Promise<void> {
    this.estateInstructions.delete(id);
  }
}

export const storage = new MemStorage();
