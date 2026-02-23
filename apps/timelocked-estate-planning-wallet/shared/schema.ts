import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const watchAddresses = pgTable("watch_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull(),
  label: text("label").notNull(),
  balance: decimal("balance", { precision: 16, scale: 8 }).default("0"),
  balanceUsd: decimal("balance_usd", { precision: 10, scale: 2 }).default("0"),
  addedDate: timestamp("added_date").defaultNow().notNull(),
});

export const timeLockedTransactions = pgTable("time_locked_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionHash: text("transaction_hash"), // Optional - may be null for pre-broadcast transactions
  rawTransactionHex: text("raw_transaction_hex"), // The signed transaction data for broadcasting
  amount: decimal("amount", { precision: 16, scale: 8 }).notNull(),
  description: text("description").notNull(),
  unlockDate: timestamp("unlock_date"), // Optional - only for timestamp locktimes
  unlockBlockHeight: integer("unlock_block_height"), // Optional - only for block height locktimes
  fromAddress: text("from_address"), // Source address to monitor
  toAddress: text("to_address"), // Destination address to monitor
  status: text("status").notNull().default("LOCKED"), // LOCKED, READY, BROADCASTED, FAILED
  isReady: boolean("is_ready").default(false),
  broadcastAttempts: decimal("broadcast_attempts", { precision: 3, scale: 0 }).default("0"),
  lastBroadcastAttempt: timestamp("last_broadcast_attempt"),
  createdDate: timestamp("created_date").defaultNow().notNull(),
});

export const estateInstructions = pgTable("estate_instructions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertWatchAddressSchema = createInsertSchema(watchAddresses).pick({
  address: true,
  label: true,
});

export const insertTimeLockedTransactionSchema = createInsertSchema(timeLockedTransactions).pick({
  transactionHash: true,
  rawTransactionHex: true,
  amount: true,
  description: true,
  unlockDate: true,
  unlockBlockHeight: true,
  fromAddress: true,
  toAddress: true,
}).extend({
  // Make transaction hash optional since pre-broadcast transactions won't have one
  transactionHash: z.string().optional(),
  // Raw transaction hex is required for broadcasting capability
  rawTransactionHex: z.string().min(1, "Raw transaction data is required").optional(),
  // Make both unlock conditions optional, but at least one must be provided
  unlockDate: z.date().optional(),
  unlockBlockHeight: z.number().int().min(1).optional(),
  // Address fields are optional
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
}).refine((data) => {
  // At least one of transactionHash or rawTransactionHex must be provided
  return data.transactionHash || data.rawTransactionHex;
}, {
  message: "Either transaction hash or raw transaction data must be provided",
  path: ["transactionHash"],
});

export const insertEstateInstructionSchema = createInsertSchema(estateInstructions).pick({
  title: true,
  content: true,
});

export type InsertWatchAddress = z.infer<typeof insertWatchAddressSchema>;
export type WatchAddress = typeof watchAddresses.$inferSelect;

export type InsertTimeLockedTransaction = z.infer<typeof insertTimeLockedTransactionSchema>;
export type TimeLockedTransaction = typeof timeLockedTransactions.$inferSelect;

export type InsertEstateInstruction = z.infer<typeof insertEstateInstructionSchema>;
export type EstateInstruction = typeof estateInstructions.$inferSelect;
