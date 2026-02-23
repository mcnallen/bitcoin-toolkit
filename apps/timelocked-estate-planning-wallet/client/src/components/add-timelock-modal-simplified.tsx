import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseRawTransaction, validateBitcoinAddress } from "@/lib/bitcoin";
import { timeLockedTransactionStorage, watchAddressStorage } from "@/lib/localStorage";
import type { InsertTimeLockedTransaction, TimeLockedTransaction } from "@shared/schema";

interface AddTimeLockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: TimeLockedTransaction | null;
}

export function AddTimeLockModal({ open, onOpenChange, transaction }: AddTimeLockModalProps) {
  const [rawTransactionHex, setRawTransactionHex] = useState("");
  const [unlockDate, setUnlockDate] = useState<Date | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [needsManualDate, setNeedsManualDate] = useState(false);
  const [blockHeightLocktime, setBlockHeightLocktime] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState({
    rawTransactionHex: "",
    description: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Effect to populate form when editing a transaction
  useEffect(() => {
    if (transaction && open) {
      setRawTransactionHex(transaction.rawTransactionHex || "");
      setAmount(transaction.amount || "");
      setDescription(transaction.description || "");
      setFromAddress(transaction.fromAddress || "");
      setToAddress(transaction.toAddress || "");
      
      if (transaction.unlockDate) {
        setUnlockDate(new Date(transaction.unlockDate));
        setNeedsManualDate(false);
      } else if (transaction.unlockBlockHeight) {
        setBlockHeightLocktime(transaction.unlockBlockHeight);
        setNeedsManualDate(false);
        setUnlockDate(undefined);
      } else {
        setNeedsManualDate(true);
        setUnlockDate(undefined);
      }
    } else if (!open) {
      // Reset form when modal closes
      resetForm();
    }
  }, [transaction, open]);

  const resetForm = () => {
    setRawTransactionHex("");
    setUnlockDate(undefined);
    setAmount("");
    setDescription("");
    setFromAddress("");
    setToAddress("");
    setNeedsManualDate(false);
    setBlockHeightLocktime(undefined);
    setErrors({
      rawTransactionHex: "",
      description: "",
    });
  };

  const handleRawTransactionChange = (value: string) => {
    setRawTransactionHex(value);
    
    if (value.trim()) {
      try {
        const parsed = parseRawTransaction(value.trim());
        
        if (parsed) {
          // Auto-fill amount and locktime info - calculate from totalOutputValue
          const totalValue = parsed.totalOutputValue || 0;
          const btcAmount = (totalValue / 100000000).toFixed(8);
          setAmount(btcAmount);
          
          // Set description with amount info
          const desc = `Pre-signed transaction - ${btcAmount} BTC`;
          setDescription(desc);
          
          // Show locktime info to user and auto-set date if possible
          if (parsed.locktime > 0) {
            if (parsed.locktime > 500000000) {
              // Unix timestamp locktime - auto-set date
              const locktimeDate = new Date(parsed.locktime * 1000);
              setUnlockDate(locktimeDate);
              setNeedsManualDate(false);
              toast({
                title: "Transaction Locktime Detected",
                description: `This transaction is locked until ${locktimeDate.toLocaleDateString()} ${locktimeDate.toLocaleTimeString()}. Amount: ${btcAmount} BTC`,
              });
            } else {
              // Block height locktime - no manual date required, show block info
              setNeedsManualDate(false);
              setUnlockDate(undefined); // Block height doesn't have a specific date
              setBlockHeightLocktime(parsed.locktime);
              toast({
                title: "Block-height Locktime Detected", 
                description: `This transaction is locked until block ${parsed.locktime}. Amount: ${btcAmount} BTC. It will be ready to broadcast when this block is reached.`,
              });
            }
          } else {
            // No locktime - require manual date
            setNeedsManualDate(true);
            setUnlockDate(undefined);
            toast({
              title: "No Locktime Found",
              description: `This transaction has no locktime. Amount: ${btcAmount} BTC. Please set a future unlock date below.`,
            });
          }
        }
        
        setErrors(prev => ({ ...prev, rawTransactionHex: "" }));
      } catch (error) {
        setErrors(prev => ({ 
          ...prev, 
          rawTransactionHex: error instanceof Error ? error.message : "Invalid transaction format" 
        }));
      }
    } else {
      setErrors(prev => ({ ...prev, rawTransactionHex: "" }));
    }
  };

  const saveTransactionMutation = useMutation({
    mutationFn: async (transactionData: {
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
    }) => {
      console.log("Saving transaction to localStorage:", transactionData);
      
      if (transaction) {
        // Update existing transaction
        const updatedTransaction = timeLockedTransactionStorage.update(transaction.id, transactionData);
        console.log("Transaction updated:", updatedTransaction);
        return updatedTransaction;
      } else {
        // Add new transaction
        const newTransaction = timeLockedTransactionStorage.add(transactionData);
        console.log("Transaction saved:", newTransaction);
        return newTransaction;
      }
    },
    onSuccess: () => {
      console.log("Transaction saved, invalidating cache");
      queryClient.invalidateQueries({ queryKey: ["time-locked-transactions-local"] });
      queryClient.invalidateQueries({ queryKey: ["watch-addresses-local"] }); // Refresh watch addresses too
      queryClient.refetchQueries({ queryKey: ["time-locked-transactions-local"] });
      queryClient.refetchQueries({ queryKey: ["watch-addresses-local"] });
      toast({
        title: transaction ? "Transaction Updated" : "Transaction Added",
        description: transaction 
          ? "Transaction has been successfully updated."
          : "Pre-signed time-locked transaction has been saved to your device. Related addresses have been added to your watch list.",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: transaction ? "Failed to Update Transaction" : "Failed to Add Transaction",
        description: error.message || "An error occurred while saving the transaction",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = {
      rawTransactionHex: "",
      description: "",
    };

    // Validation
    if (!rawTransactionHex.trim()) {
      newErrors.rawTransactionHex = "Raw transaction data is required";
    } else {
      try {
        parseRawTransaction(rawTransactionHex.trim());
      } catch (error) {
        newErrors.rawTransactionHex = error instanceof Error ? error.message : "Invalid transaction format";
      }
    }

    // Check if this is a block height locktime from parsing
    let isBlockHeight = false;
    try {
      const parsed = parseRawTransaction(rawTransactionHex.trim());
      isBlockHeight = !!(parsed && parsed.locktime > 0 && parsed.locktime <= 500000000);
    } catch (e) {
      // Already handled above
    }
    
    // Only validate unlock date for timestamp locktimes
    if (!isBlockHeight) {
      if (!unlockDate) {
        newErrors.rawTransactionHex = "Unable to extract unlock date from transaction. Please ensure your transaction has a valid locktime or manually set the date.";
      } else if (unlockDate <= new Date()) {
        newErrors.rawTransactionHex = "The extracted unlock date is in the past. Please check your transaction locktime.";
      }
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error !== "")) {
      return;
    }

    try {
      const parsed = parseRawTransaction(rawTransactionHex.trim());
      
      if (!parsed) {
        throw new Error("Failed to parse transaction");
      }

      // Calculate amount from total output value
      const totalValue = parsed.totalOutputValue || 0;
      const btcAmount = (totalValue / 100000000).toFixed(8);
      
      // Check if this is a block height or timestamp locktime
      const hasBlockHeight = parsed && parsed.locktime > 0 && parsed.locktime <= 500000000;
      
      // For block height locktimes, we don't need a specific date
      if (!hasBlockHeight && !unlockDate) {
        toast({
          title: "Error",
          description: "Unlock date is required for timestamp locktimes",
          variant: "destructive",
        });
        return;
      }

      const transaction = {
        transactionHash: "", // Will be filled when broadcasted
        unlockDate: hasBlockHeight ? undefined : unlockDate,
        unlockBlockHeight: hasBlockHeight ? parsed?.locktime : undefined,
        amount: btcAmount,
        description: description.trim(),
        rawTransactionHex: rawTransactionHex.trim(),
        fromAddress: fromAddress.trim() || undefined,
        toAddress: toAddress.trim() || undefined,
        status: "LOCKED",
        broadcastAttempts: "0",
        lastBroadcastAttempt: null,
      };

      // Auto-add addresses to watch list if they're valid Bitcoin addresses
      if (fromAddress.trim() && validateBitcoinAddress(fromAddress.trim())) {
        const existingFromAddress = watchAddressStorage.getAll().find(a => a.address === fromAddress.trim());
        if (!existingFromAddress) {
          watchAddressStorage.add({
            address: fromAddress.trim(),
            label: `From address - ${description.trim()}`,
            balance: null,
            balanceUsd: null,
          });
        }
      }
      
      if (toAddress.trim() && validateBitcoinAddress(toAddress.trim())) {
        const existingToAddress = watchAddressStorage.getAll().find(a => a.address === toAddress.trim());
        if (!existingToAddress) {
          watchAddressStorage.add({
            address: toAddress.trim(),
            label: `To address - ${description.trim()}`,
            balance: null,
            balanceUsd: null,
          });
        }
      }

      saveTransactionMutation.mutate(transaction);
    } catch (error) {
      toast({
        title: "Invalid Transaction",
        description: error instanceof Error ? error.message : "Failed to parse transaction",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
{transaction ? "Edit Time-Locked Transaction" : "Add Pre-Signed Time-Locked Transaction"}
          </DialogTitle>
          <DialogDescription>
            Import a pre-signed raw transaction from any Bitcoin wallet (Electrum, Bitcoin Core, etc.). 
            The transaction will be automatically broadcast when the unlock time passes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="rawTransaction">Raw Transaction Hex *</Label>
            <Textarea
              id="rawTransaction"
              placeholder="Paste the raw transaction hex data from your wallet (e.g., from Electrum's 'Share' feature)..."
              value={rawTransactionHex}
              onChange={(e) => handleRawTransactionChange(e.target.value)}
              className={cn("min-h-[120px] font-mono text-sm", transaction && "bg-gray-50")}
              data-testid="textarea-raw-transaction"
              disabled={!!transaction}
            />
            {errors.rawTransactionHex && (
              <p className="text-sm text-red-600" data-testid="error-raw-transaction">
                {errors.rawTransactionHex}
              </p>
            )}
            <p className="text-xs text-gray-500">
              {transaction 
                ? "Raw transaction data cannot be edited for security reasons"
                : "Get this from your wallet's \"Share\" or \"Export\" raw transaction feature"
              }
            </p>
          </div>

          <div className="space-y-2">
            <Label>Unlock Condition {needsManualDate ? "* (Manual Selection Required)" : "(Auto-extracted from transaction)"}</Label>
            {needsManualDate ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !unlockDate && "text-muted-foreground"
                    )}
                    data-testid="button-manual-date-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {unlockDate ? format(unlockDate, "PPP 'at' p") : "Select unlock date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={unlockDate}
                    onSelect={setUnlockDate}
                    disabled={(date) => date <= new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <div className="p-3 bg-gray-50 border rounded-md text-sm">
                {unlockDate ? (
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="font-medium">{format(unlockDate, "PPP 'at' p")}</span>
                  </div>
                ) : blockHeightLocktime ? (
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="font-medium text-blue-600">Block Height Locktime: Block #{blockHeightLocktime}</span>
                  </div>
                ) : (
                  <span className="text-gray-500">Enter raw transaction hex to extract unlock condition</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Amount (Auto-extracted from transaction)</Label>
            <div className="p-3 bg-gray-50 border rounded-md text-sm">
              {amount ? (
                <span className="font-medium">{amount} BTC</span>
              ) : (
                <span className="text-gray-500">Enter raw transaction hex to extract amount</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="e.g. 'Estate inheritance payment to beneficiary'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-description"
            />
            {errors.description && (
              <p className="text-sm text-red-600" data-testid="error-description">
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromAddress">From Address (Optional)</Label>
              <Input
                id="fromAddress"
                placeholder="Source address to monitor (e.g., 1A1zP1...)"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                data-testid="input-from-address"
              />
              <p className="text-xs text-gray-500">
                Monitor the source address for balance changes
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="toAddress">To Address (Optional)</Label>
              <Input
                id="toAddress"
                placeholder="Destination address to monitor (e.g., 3FG2C4...)"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                data-testid="input-to-address"
              />
              <p className="text-xs text-gray-500">
                Monitor the destination address for incoming funds
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveTransactionMutation.isPending}
              data-testid="button-add-transaction"
            >
              {saveTransactionMutation.isPending 
                ? (transaction ? "Updating..." : "Adding...") 
                : (transaction ? "Update Transaction" : "Add Transaction")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}