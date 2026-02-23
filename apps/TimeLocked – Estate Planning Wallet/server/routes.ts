import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertWatchAddressSchema,
  insertTimeLockedTransactionSchema,
  insertEstateInstructionSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Watch Addresses Routes
  app.get("/api/watch-addresses", async (req, res) => {
    try {
      const addresses = await storage.getWatchAddresses();
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watch addresses" });
    }
  });

  app.post("/api/watch-addresses", async (req, res) => {
    try {
      const validatedData = insertWatchAddressSchema.parse(req.body);
      const address = await storage.createWatchAddress(validatedData);
      res.status(201).json(address);
    } catch (error) {
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.delete("/api/watch-addresses/:id", async (req, res) => {
    try {
      await storage.deleteWatchAddress(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete watch address" });
    }
  });

  // Time Locked Transactions Routes
  app.get("/api/time-locked-transactions", async (req, res) => {
    try {
      const transactions = await storage.getTimeLockedTransactions();
      
      // Update transaction status based on current time
      const now = new Date();
      const updatedTransactions = await Promise.all(
        transactions.map(async (tx) => {
          const unlockDate = new Date(tx.unlockDate);
          const isReady = unlockDate <= now;
          
          if (tx.isReady !== isReady || (isReady && tx.status === "LOCKED")) {
            const status = isReady ? "READY" : "LOCKED";
            return await storage.updateTimeLockedTransactionStatus(tx.id, status, isReady);
          }
          
          return tx;
        })
      );
      
      res.json(updatedTransactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time-locked transactions" });
    }
  });

  app.post("/api/time-locked-transactions", async (req, res) => {
    try {
      console.log("POST request body:", req.body);
      
      // Convert unlockDate string to Date object if needed
      if (req.body.unlockDate && typeof req.body.unlockDate === 'string') {
        req.body.unlockDate = new Date(req.body.unlockDate);
      }
      
      const validatedData = insertTimeLockedTransactionSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const transaction = await storage.createTimeLockedTransaction(validatedData);
      console.log("Created transaction:", transaction);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating time-locked transaction:", error);
      if (error.issues) {
        console.error("Validation errors:", error.issues);
      }
      res.status(400).json({ 
        message: "Invalid data provided", 
        error: error.message,
        details: error.issues || []
      });
    }
  });

  // Broadcast a ready transaction
  app.post("/api/time-locked-transactions/:id/broadcast", async (req, res) => {
    try {
      const transaction = await storage.getTimeLockedTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (!transaction.rawTransactionHex) {
        return res.status(400).json({ message: "No raw transaction data available for broadcasting" });
      }

      const unlockDate = new Date(transaction.unlockDate);
      const now = new Date();
      if (unlockDate > now) {
        return res.status(400).json({ message: "Transaction is not yet ready to broadcast" });
      }

      // Increment broadcast attempts
      const attempts = parseInt(transaction.broadcastAttempts || "0") + 1;
      await storage.updateTimeLockedTransactionBroadcastAttempt(req.params.id, attempts);

      // Import BroadcastAPI dynamically (since it's a client-side module)
      const { BroadcastAPI } = await import("../client/src/lib/bitcoin.js");
      const result = await BroadcastAPI.broadcastTransaction(transaction.rawTransactionHex);

      if (result.success && result.txid) {
        // Update transaction status to BROADCASTED with the new transaction hash
        const updatedTransaction = await storage.updateTimeLockedTransactionStatus(
          req.params.id, 
          "BROADCASTED", 
          true, 
          result.txid
        );
        res.json({ 
          success: true, 
          txid: result.txid, 
          transaction: updatedTransaction 
        });
      } else {
        // Update status to FAILED
        await storage.updateTimeLockedTransactionStatus(req.params.id, "FAILED", true);
        res.status(500).json({ 
          success: false, 
          error: result.error || "Broadcast failed" 
        });
      }
    } catch (error) {
      console.error("Error broadcasting transaction:", error);
      res.status(500).json({ message: "Failed to broadcast transaction" });
    }
  });

  // Get transactions ready for broadcasting
  app.get("/api/time-locked-transactions/ready-to-broadcast", async (req, res) => {
    try {
      const readyTransactions = await storage.getReadyToBroadcastTransactions();
      res.json(readyTransactions);
    } catch (error) {
      console.error("Error fetching ready transactions:", error);
      res.status(500).json({ message: "Failed to fetch ready transactions" });
    }
  });



  app.delete("/api/time-locked-transactions/:id", async (req, res) => {
    try {
      console.log("DELETE request for transaction ID:", req.params.id);
      const transaction = await storage.getTimeLockedTransaction(req.params.id);
      console.log("Found transaction:", transaction ? "Yes" : "No");
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      await storage.deleteTimeLockedTransaction(req.params.id);
      console.log("Transaction deleted successfully");
      res.status(204).send();
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Estate Instructions Routes
  app.get("/api/estate-instructions", async (req, res) => {
    try {
      const instructions = await storage.getEstateInstructions();
      res.json(instructions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch estate instructions" });
    }
  });

  app.post("/api/estate-instructions", async (req, res) => {
    try {
      const validatedData = insertEstateInstructionSchema.parse(req.body);
      const instruction = await storage.createEstateInstruction(validatedData);
      res.status(201).json(instruction);
    } catch (error) {
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.patch("/api/estate-instructions/:id", async (req, res) => {
    try {
      const validatedData = insertEstateInstructionSchema.partial().parse(req.body);
      const instruction = await storage.updateEstateInstruction(req.params.id, validatedData);
      res.json(instruction);
    } catch (error) {
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.delete("/api/estate-instructions/:id", async (req, res) => {
    try {
      await storage.deleteEstateInstruction(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete instruction" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
