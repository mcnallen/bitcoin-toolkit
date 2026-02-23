import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Info, Radio, Clock, Trash2, Eye, DollarSign, Bitcoin, RefreshCw, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { calculateTimeRemaining } from "@/lib/bitcoin";

// Helper function to estimate block height unlock time
const estimateBlockHeightUnlockTime = (targetBlockHeight: number, currentBlockHeight: number | null): string => {
  const currentHeight = currentBlockHeight || 908429; // Fallback to approximate current height
  const averageBlockTime = 10; // minutes per block
  
  if (targetBlockHeight <= currentHeight) {
    return "Ready to broadcast (block height reached)";
  }
  
  const blocksRemaining = targetBlockHeight - currentHeight;
  const minutesRemaining = blocksRemaining * averageBlockTime;
  const hoursRemaining = Math.floor(minutesRemaining / 60);
  const daysRemaining = Math.floor(hoursRemaining / 24);
  
  if (daysRemaining > 0) {
    return `Estimated: ${daysRemaining} days, ${hoursRemaining % 24} hours (Block #${targetBlockHeight})`;
  } else if (hoursRemaining > 0) {
    return `Estimated: ${hoursRemaining} hours, ${minutesRemaining % 60} minutes (Block #${targetBlockHeight})`;
  } else {
    return `Estimated: ${minutesRemaining} minutes (Block #${targetBlockHeight})`;
  }
};
import { apiRequest } from "@/lib/queryClient";
import { timeLockedTransactionStorage, watchAddressStorage } from "@/lib/localStorage";
import { validateBitcoinAddress, BitcoinAPI } from "@/lib/bitcoin";
import type { TimeLockedTransaction, WatchAddress } from "@shared/schema";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

// Component to display monitored addresses under each transaction
const MonitoredAddresses = ({ transaction, fromAddress, toAddress }: {
  transaction: TimeLockedTransaction;
  fromAddress?: string | null;
  toAddress?: string | null;
}) => {
  const queryClient = useQueryClient();
  const { data: watchAddresses = [] } = useQuery<WatchAddress[]>({
    queryKey: ["watch-addresses-local"],
    queryFn: () => {
      console.log("Fetching watch addresses from localStorage");
      return watchAddressStorage.getAll();
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const fromWatchAddress = fromAddress ? watchAddresses.find(addr => addr.address === fromAddress) : null;
  const toWatchAddress = toAddress ? watchAddresses.find(addr => addr.address === toAddress) : null;

  // Function to fetch and update balance for an address using the same API as original Watch Addresses
  const updateAddressBalance = async (address: string) => {
    try {
      console.log("Fetching balance for address:", address);
      
      // Use the same BitcoinAPI from the original implementation
      const addressInfo = await BitcoinAPI.getAddressInfo(address);
      if (addressInfo) {
        const btcPrice = await BitcoinAPI.getBTCPrice();
        const balanceBTC = BitcoinAPI.satoshisToBTC(addressInfo.balance);
        const balanceUSD = btcPrice > 0 ? (parseFloat(balanceBTC) * btcPrice).toFixed(2) : "0";
        
        // Update the watch address in localStorage
        const addresses = watchAddressStorage.getAll();
        const existingAddress = addresses.find(addr => addr.address === address);
        if (existingAddress) {
          const updatedAddresses = addresses.map(addr => 
            addr.address === address 
              ? { ...addr, balance: balanceBTC, balanceUsd: balanceUSD }
              : addr
          );
          watchAddressStorage.save(updatedAddresses);
          queryClient.invalidateQueries({ queryKey: ["watch-addresses-local"] });
          console.log("Updated balance for address:", address, "Balance:", balanceBTC, "BTC", "USD:", balanceUSD);
        }
      }
    } catch (error) {
      console.error("Failed to fetch balance for address:", address, error);
    }
  };

  // Auto-fetch balances when component mounts or addresses change
  useEffect(() => {
    if (fromAddress && (!fromWatchAddress?.balance || fromWatchAddress.balance === "0.00000000")) {
      updateAddressBalance(fromAddress);
    }
    if (toAddress && (!toWatchAddress?.balance || toWatchAddress.balance === "0.00000000")) {
      updateAddressBalance(toAddress);
    }
  }, [fromAddress, toAddress, fromWatchAddress?.balance, toWatchAddress?.balance]);

  if (!fromAddress && !toAddress) return null;

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center mb-2">
        <Eye className="w-4 h-4 text-gray-500 mr-1" />
        <span className="text-sm font-medium text-gray-700">Monitored Addresses</span>
      </div>
      
      <div className="space-y-2">
        {fromAddress && (
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-blue-600 font-medium">From Address:</p>
              <p className="text-xs font-mono text-gray-600 truncate" title={fromAddress}>
                {fromAddress}
              </p>
            </div>
            {fromWatchAddress && (
              <div className="text-right ml-2">
                <div className="flex items-center text-xs text-gray-700">
                  <Bitcoin className="w-3 h-3 mr-1" />
                  <span className="font-medium">
                    {fromWatchAddress.balance ? `${fromWatchAddress.balance} BTC` : "Loading..."}
                  </span>
                  <a
                    href={`https://blockstream.info/address/${fromAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
                    title="View on Blockstream Explorer"
                  >
                    ↗
                  </a>
                </div>
                {fromWatchAddress.balanceUsd && parseFloat(fromWatchAddress.balanceUsd) > 0 && (
                  <div className="flex items-center text-xs text-gray-500">
                    <DollarSign className="w-3 h-3 mr-1" />
                    <span>${fromWatchAddress.balanceUsd}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {toAddress && (
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-green-600 font-medium">To Address:</p>
              <p className="text-xs font-mono text-gray-600 truncate" title={toAddress}>
                {toAddress}
              </p>
            </div>
            {toWatchAddress && (
              <div className="text-right ml-2">
                <div className="flex items-center text-xs text-gray-700">
                  <Bitcoin className="w-3 h-3 mr-1" />
                  <span className="font-medium">
                    {toWatchAddress.balance ? `${toWatchAddress.balance} BTC` : "Loading..."}
                  </span>
                  <a
                    href={`https://blockstream.info/address/${toAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
                    title="View on Blockstream Explorer"
                  >
                    ↗
                  </a>
                </div>
                {toWatchAddress.balanceUsd && parseFloat(toWatchAddress.balanceUsd) > 0 && (
                  <div className="flex items-center text-xs text-gray-500">
                    <DollarSign className="w-3 h-3 mr-1" />
                    <span>${toWatchAddress.balanceUsd}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface TimeLockedTransactionsProps {
  transactions: TimeLockedTransaction[];
  onAddTransaction: () => void;
  onEditTransaction: (transaction: TimeLockedTransaction) => void;
}

export function TimeLockedTransactions({ transactions, onAddTransaction, onEditTransaction }: TimeLockedTransactionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch current Bitcoin block height
  const fetchBlockHeight = async () => {
    try {
      const response = await fetch('https://blockstream.info/api/blocks/tip/height');
      if (response.ok) {
        const height = await response.json();
        setCurrentBlockHeight(height);
      }
    } catch (error) {
      console.error('Failed to fetch block height:', error);
    }
  };

  // Update block height every 10 minutes and on component mount
  useEffect(() => {
    fetchBlockHeight(); // Initial fetch
    const blockTimer = setInterval(fetchBlockHeight, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(blockTimer);
  }, []);

  // Listen for query invalidation to also refresh block height
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && event?.query?.queryKey?.[0] === 'time-locked-transactions-local') {
        fetchBlockHeight(); // Refresh block height when transactions are refreshed
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const broadcastMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const transactions = timeLockedTransactionStorage.getAll();
      const transaction = transactions.find(tx => tx.id === transactionId);
      
      if (!transaction) {
        throw new Error("Transaction not found");
      }
      
      if (!transaction.rawTransactionHex) {
        throw new Error("No raw transaction data available for broadcast");
      }

      // Broadcast using client-side Bitcoin API
      const result = await BitcoinAPI.broadcastTransaction(transaction.rawTransactionHex);
      
      if (!result.success) {
        // Update transaction status to FAILED
        timeLockedTransactionStorage.update(transactionId, {
          status: "FAILED",
          broadcastAttempts: String(parseInt(transaction.broadcastAttempts || "0") + 1),
          lastBroadcastAttempt: new Date(),
        });
        throw new Error(result.error || "Broadcast failed");
      }

      // Update transaction status to BROADCASTED with TXID
      timeLockedTransactionStorage.update(transactionId, {
        status: "BROADCASTED",
        transactionHash: result.txid,
        broadcastAttempts: String(parseInt(transaction.broadcastAttempts || "0") + 1),
        lastBroadcastAttempt: new Date(),
      });

      return { success: true, txid: result.txid };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["time-locked-transactions-local"] });
      toast({
        title: "Transaction Broadcasted!",
        description: `Successfully broadcast to Bitcoin network. TXID: ${data.txid?.substring(0, 16)}...`,
      });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["time-locked-transactions-local"] });
      toast({
        title: "Broadcast Failed",
        description: error.message || "Failed to broadcast transaction to the network",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      console.log("Deleting transaction from localStorage:", transactionId);
      timeLockedTransactionStorage.delete(transactionId);
      return { id: transactionId };
    },
    onSuccess: () => {
      console.log("Delete successful, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["time-locked-transactions-local"] });
      toast({
        title: "Transaction Deleted",
        description: "Time-locked transaction has been removed from your device",
      });
    },
    onError: (error: any) => {
      console.error("Delete failed:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete the transaction",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string, isReady: boolean, hasRawTx: boolean) => {
    if (status === "BROADCASTED") {
      return <Badge className="bg-blue-100 text-blue-800">BROADCASTED</Badge>;
    }
    if (status === "FAILED") {
      return <Badge className="bg-red-100 text-red-800">FAILED</Badge>;
    }
    if (isReady && hasRawTx) {
      return <Badge className="bg-green-100 text-green-800">READY TO BROADCAST</Badge>;
    }
    if (isReady) {
      return <Badge className="bg-green-100 text-green-800">READY</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-800">LOCKED</Badge>;
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Time-Locked Transactions
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>nTimeLock transactions that can only be broadcast after a specific date</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3 h-3" />
            <span className="font-mono" data-testid="utc-time-display">
              {currentTime.toISOString().replace('T', ' ').slice(0, 19)} UTC
            </span>
          </div>
          <div className="text-gray-400" data-testid="block-height-display">
            Current Block Height: {currentBlockHeight !== null ? `#${currentBlockHeight.toLocaleString()}` : 'Loading...'}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {transactions.map((transaction) => {
          const unlockDate = transaction.unlockDate ? new Date(transaction.unlockDate) : null;
          const timeRemaining = unlockDate ? calculateTimeRemaining(unlockDate) : null;
          const blockHeightEstimate = transaction.unlockBlockHeight ? 
            estimateBlockHeightUnlockTime(transaction.unlockBlockHeight, currentBlockHeight) : null;
          
          // Calculate if transaction is ready based on current conditions
          const isCurrentlyReady = transaction.unlockBlockHeight 
            ? (currentBlockHeight !== null && transaction.unlockBlockHeight <= currentBlockHeight)
            : (unlockDate ? unlockDate <= new Date() : false);
          
          return (
            <div 
              key={transaction.id}
              className="border border-gray-200 rounded-lg p-4"
              data-testid={`card-transaction-${transaction.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {getStatusBadge(transaction.status, isCurrentlyReady, !!transaction.rawTransactionHex)}
                    <span className="ml-2 text-sm font-medium text-gray-900" data-testid={`text-amount-${transaction.id}`}>
                      {transaction.amount} BTC
                    </span>
                    {transaction.rawTransactionHex && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        🔐 Pre-signed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1" data-testid={`text-description-${transaction.id}`}>
                    {transaction.description}
                  </p>
                  {transaction.transactionHash && (
                    <p className="font-mono text-xs text-gray-500 truncate" data-testid={`text-hash-${transaction.id}`}>
                      TXID: {transaction.transactionHash}
                    </p>
                  )}
                  {transaction.rawTransactionHex && !transaction.transactionHash && (
                    <p className="text-xs text-purple-600" data-testid={`text-raw-indicator-${transaction.id}`}>
                      {isCurrentlyReady 
                        ? "Raw transaction ready for manual broadcast"
                        : "Raw transaction loaded - waiting for unlock"
                      }
                    </p>
                  )}
                  {transaction.broadcastAttempts && parseInt(transaction.broadcastAttempts) > 0 && (
                    <p className="text-xs text-orange-600" data-testid={`text-attempts-${transaction.id}`}>
                      Broadcast attempts: {transaction.broadcastAttempts}
                    </p>
                  )}
                  
                  {/* Display monitored addresses with balances */}
                  {(transaction.fromAddress || transaction.toAddress) && (
                    <MonitoredAddresses 
                      transaction={transaction}
                      fromAddress={transaction.fromAddress}
                      toAddress={transaction.toAddress}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {onEditTransaction && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTransaction(transaction)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          data-testid={`button-edit-${transaction.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit transaction</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          console.log("Delete button clicked for transaction:", transaction.id);
                          console.log("Full transaction object:", transaction);
                          deleteMutation.mutate(transaction.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${transaction.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete transaction</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {transaction.unlockBlockHeight ? "Unlock Block:" : "Unlock Date:"}
                  </p>
                  <p className="text-sm font-medium" data-testid={`text-unlock-date-${transaction.id}`}>
                    {transaction.unlockBlockHeight ? (
                      <span className="font-mono">Block #{transaction.unlockBlockHeight}</span>
                    ) : unlockDate ? (
                      <>
                        {format(unlockDate, "PPP 'at' p")}
                        <span className="text-xs text-gray-500 ml-1">(Local Time)</span>
                      </>
                    ) : (
                      "Unknown"
                    )}
                  </p>
                </div>
                
                {isCurrentlyReady && transaction.status !== "BROADCASTED" && transaction.rawTransactionHex ? (
                  <Button
                    onClick={() => broadcastMutation.mutate(transaction.id)}
                    disabled={broadcastMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid={`button-broadcast-${transaction.id}`}
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    {broadcastMutation.isPending ? "Broadcasting..." : "Broadcast Now"}
                  </Button>
                ) : transaction.status === "BROADCASTED" ? (
                  <div className="text-right">
                    <p className="text-sm text-green-600 font-medium">✓ Successfully Broadcasted</p>
                    {transaction.transactionHash && (
                      <p className="text-xs text-gray-500">
                        View on blockchain explorer
                      </p>
                    )}
                  </div>
                ) : transaction.status === "FAILED" ? (
                  <div className="text-right">
                    <p className="text-sm text-red-600 font-medium">✗ Broadcast Failed</p>
                    <Button
                      onClick={() => broadcastMutation.mutate(transaction.id)}
                      disabled={broadcastMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      data-testid={`button-retry-${transaction.id}`}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {transaction.unlockBlockHeight ? "Type:" : "Time Remaining:"}
                    </p>
                    <p className="text-sm font-medium" data-testid={`text-time-remaining-${transaction.id}`}>
                      {transaction.unlockBlockHeight ? (
                        <span className="text-blue-600">Block Height Locktime</span>
                      ) : (
                        timeRemaining || "Unknown"
                      )}
                    </p>
                    {blockHeightEstimate && (
                      <p className="text-xs text-blue-600 mt-1" data-testid={`text-block-estimate-${transaction.id}`}>
                        {blockHeightEstimate}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        <Button
          variant="outline"
          onClick={onAddTransaction}
          className="w-full border-2 border-dashed border-gray-300 hover:border-blue-600 hover:text-blue-600 h-16"
          data-testid="button-add-timelock-inline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Time-Locked Transaction
        </Button>
      </CardContent>
    </Card>
  );
}
