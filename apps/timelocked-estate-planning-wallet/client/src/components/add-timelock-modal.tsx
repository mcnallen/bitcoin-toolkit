import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { validateTransactionHash, validateRawTransaction, parseRawTransaction, TransactionAPI, BitcoinAPI } from "@/lib/bitcoin";

interface AddTimeLockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTimeLockModal({ open, onOpenChange }: AddTimeLockModalProps) {
  const [entryMode, setEntryMode] = useState<"existing" | "raw">("existing");
  const [transactionHash, setTransactionHash] = useState("");
  const [rawTransactionHex, setRawTransactionHex] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isLoadingTransaction, setIsLoadingTransaction] = useState(false);
  const [transactionLoaded, setTransactionLoaded] = useState<boolean | 'manual'>(false);
  const [errors, setErrors] = useState({
    transactionHash: "",
    rawTransactionHex: "",
    unlockDate: "",
    amount: "",
    description: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchTransactionDetails = async (txHash: string) => {
    if (!validateTransactionHash(txHash)) {
      return;
    }

    setIsLoadingTransaction(true);
    setTransactionLoaded(false);
    
    try {
      const txInfo = await TransactionAPI.getTransactionInfo(txHash);
      
      if (txInfo) {
        // Auto-fill unlock date if available
        if (txInfo.unlockDate) {
          const dateStr = txInfo.unlockDate.toISOString().split('T')[0];
          setUnlockDate(dateStr);
        } else if (txInfo.locktime > 0) {
          // Show info about block-height based locktime
          toast({
            title: "Block-height based nTimeLock detected",
            description: `This transaction is locked until block ${txInfo.locktime}. You'll need to manually enter the estimated unlock date.`,
          });
        } else {
          // No locktime - not a time-locked transaction
          toast({
            title: "No nTimeLock found",
            description: "This transaction doesn't appear to be time-locked (locktime = 0)",
            variant: "destructive",
          });
        }

        // Auto-fill amount
        const btcAmount = BitcoinAPI.satoshisToBTC(txInfo.totalOutputAmount);
        setAmount(btcAmount);

        // Set a default description with transaction info
        setDescription(`Transaction ${txHash.substring(0,8)}... - ${btcAmount} BTC`);
        
        setTransactionLoaded(true);
        
        toast({
          title: "Transaction Details Loaded",
          description: `Loaded ${btcAmount} BTC transaction ${txInfo.confirmed ? '(confirmed)' : '(unconfirmed)'}`,
        });
      } else {
        toast({
          title: "Transaction Not Found",
          description: "This transaction isn't on the blockchain yet. If created in Electrum, use 'Clear & edit manually' to track it.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast({
        title: "Error Loading Transaction",
        description: "Failed to fetch transaction details. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransaction(false);
    }
  };

  const addTransactionMutation = useMutation({
    mutationFn: async (data: {
      transactionHash?: string;
      rawTransactionHex?: string;
      unlockDate: string;
      amount: string;
      description: string;
    }) => {
      const response = await apiRequest("POST", "/api/time-locked-transactions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-locked-transactions"] });
      toast({
        title: "Transaction Added",
        description: "Time-locked transaction has been successfully added",
      });
      onOpenChange(false);
      setTransactionHash("");
      setRawTransactionHex("");
      setUnlockDate("");
      setAmount("");
      setDescription("");
      setIsLoadingTransaction(false);
      setTransactionLoaded(false);
      setErrors({
        transactionHash: "",
        rawTransactionHex: "",
        unlockDate: "",
        amount: "",
        description: "",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Add Transaction",
        description: "Please check your input and try again",
        variant: "destructive",
      });
    },
  });

  // Function to handle raw transaction parsing
  const parseRawTransactionData = () => {
    if (!rawTransactionHex.trim()) return;
    
    const parsed = parseRawTransaction(rawTransactionHex.trim());
    if (parsed) {
      // Extract unlock date from locktime
      if (parsed.locktime > 0) {
        if (parsed.locktime < 500000000) {
          toast({
            title: "Block-height nTimeLock detected",
            description: `Transaction locked until block ${parsed.locktime}. Please manually enter the estimated unlock date.`,
          });
        } else {
          const unlockDateObj = new Date(parsed.locktime * 1000);
          setUnlockDate(unlockDateObj.toISOString().split('T')[0]);
          
          toast({
            title: "Unlock Date Extracted",
            description: `Found nTimeLock date: ${unlockDateObj.toLocaleDateString()}`,
          });
        }
      } else {
        toast({
          title: "No nTimeLock Found",
          description: "This transaction has no time lock (locktime = 0). You can broadcast it immediately.",
        });
      }
      
      // Extract amount from outputs
      if (parsed.totalOutputValue && parsed.totalOutputValue > 0) {
        const btcAmount = (parsed.totalOutputValue / 100000000).toFixed(8);
        setAmount(btcAmount);
        
        toast({
          title: "Amount Extracted",
          description: `Found output amount: ${btcAmount} BTC`,
        });
      }
      
      // Set default description
      setDescription(`Electrum pre-signed transaction - ${parsed.locktime > 0 ? 'Time-locked' : 'Ready to broadcast'}`);
      setTransactionLoaded('manual');
      

      
    } else {
      toast({
        title: "Parse Failed",
        description: "Could not parse the raw transaction data. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {
      transactionHash: "",
      rawTransactionHex: "",
      unlockDate: "",
      amount: "",
      description: "",
    };
    let isValid = true;

    // Validate entry mode specific fields
    if (entryMode === "existing") {
      if (!transactionHash.trim()) {
        newErrors.transactionHash = "Transaction hash is required";
        isValid = false;
      } else if (!validateTransactionHash(transactionHash.trim())) {
        newErrors.transactionHash = "Invalid transaction hash format";
        isValid = false;
      }
    } else {
      if (!rawTransactionHex.trim()) {
        newErrors.rawTransactionHex = "Raw transaction data is required";
        isValid = false;
      } else if (!validateRawTransaction(rawTransactionHex.trim())) {
        newErrors.rawTransactionHex = "Invalid raw transaction format";
        isValid = false;
      }
    }

    // Common validations
    if (!unlockDate) {
      newErrors.unlockDate = "Unlock date is required";
      isValid = false;
    } else {
      const selectedDate = new Date(unlockDate);
      const now = new Date();
      if (selectedDate <= now) {
        newErrors.unlockDate = "Unlock date must be in the future";
        isValid = false;
      }
    }

    if (!amount.trim()) {
      newErrors.amount = "Amount is required";
      isValid = false;
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = "Amount must be a positive number";
        isValid = false;
      }
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const mutationData: any = {
      unlockDate,
      amount: amount.trim(),
      description: description.trim(),
    };

    if (entryMode === "existing") {
      mutationData.transactionHash = transactionHash.trim();
    } else {
      mutationData.rawTransactionHex = rawTransactionHex.trim();
    }

    addTransactionMutation.mutate(mutationData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 sm:max-w-2xl w-[calc(100%-2rem)] sm:w-full max-h-[90vh] overflow-y-auto" data-testid="modal-add-timelock">
        <DialogHeader>
          <DialogTitle>Add Time-Locked Transaction</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Track nTimeLock transactions that can automatically broadcast when unlock time passes. Perfect for estate planning!
          </p>
        </DialogHeader>
        
        <Tabs value={entryMode} onValueChange={(value) => setEntryMode(value as "existing" | "raw")} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" data-testid="tab-existing">
              Existing Transaction
            </TabsTrigger>
            <TabsTrigger value="raw" data-testid="tab-raw">
              Raw Transaction Data
            </TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <TabsContent value="existing" className="space-y-4 mt-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 font-medium mb-1">📋 Existing Transactions</p>
                <p className="text-blue-700 text-sm">
                  For transactions already broadcast to the Bitcoin network. The app will fetch details automatically.
                </p>
              </div>

              <div>
                <Label htmlFor="transactionHash" className="text-sm font-medium text-gray-700">
                  Transaction Hash (TXID)
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your nTimeLock transaction hash to auto-load amount and unlock date
                </p>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="transactionHash"
                    type="text"
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    placeholder="a1b2c3d4e5f67890123456789012345678901234567890abcdef1234567890ab"
                    className={`font-mono text-sm ${errors.transactionHash ? 'border-red-500' : ''}`}
                    data-testid="input-transaction-hash"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fetchTransactionDetails(transactionHash)}
                    disabled={!validateTransactionHash(transactionHash) || isLoadingTransaction}
                    className="px-3 whitespace-nowrap"
                    data-testid="button-fetch-transaction"
                  >
                    {isLoadingTransaction ? "Loading..." : "Fetch"}
                  </Button>
                </div>
                {errors.transactionHash && (
                  <p className="text-sm text-red-600 mt-1" data-testid="error-transaction-hash">
                    {errors.transactionHash}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="raw" className="space-y-4 mt-0">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-purple-800 font-medium mb-1">🔐 Raw Transaction Data</p>
                <p className="text-purple-700 text-sm mb-2">
                  For pre-signed transactions (like from Electrum "Share" feature). The app can broadcast these automatically when the unlock time passes!
                </p>
                <p className="text-purple-600 text-xs">
                  Perfect for estate planning - no need to keep Electrum running or remember to broadcast manually.
                </p>
              </div>

              <div>
                <Label htmlFor="rawTransactionHex" className="text-sm font-medium text-gray-700">
                  Raw Transaction Data
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Paste the signed transaction hex from Electrum's "Share" button
                </p>
                <Textarea
                  id="rawTransactionHex"
                  value={rawTransactionHex}
                  onChange={(e) => setRawTransactionHex(e.target.value)}
                  placeholder="02000000018d9439a91c38cd0765ba578939dd8b564e12ca809a917b09e5a1167fcec4d948..."
                  className={`mt-2 font-mono text-xs h-24 resize-none ${errors.rawTransactionHex ? 'border-red-500' : ''}`}
                  data-testid="input-raw-transaction"
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.rawTransactionHex && (
                    <p className="text-sm text-red-600" data-testid="error-raw-transaction">
                      {errors.rawTransactionHex}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={parseRawTransactionData}
                    disabled={!rawTransactionHex.trim()}
                    className="ml-auto"
                    data-testid="button-parse-transaction"
                  >
                    Parse Transaction
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Common fields for both modes */}
            <div>
              <Label htmlFor="unlockDate" className="text-sm font-medium text-gray-700">
                Unlock Date
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                When this transaction can be broadcast to the network
              </p>
              <Input
                id="unlockDate"
                type="date"
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
                className={`mt-2 ${errors.unlockDate ? 'border-red-500' : ''}`}
                data-testid="input-unlock-date"
              />
              {errors.unlockDate && (
                <p className="text-sm text-red-600 mt-1" data-testid="error-unlock-date">
                  {errors.unlockDate}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Amount (BTC)
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Total amount being transferred
              </p>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.12345678"
                className={`mt-2 ${errors.amount ? 'border-red-500' : ''}`}
                data-testid="input-amount"
              />
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1" data-testid="error-amount">
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Label for estate planning purposes
              </p>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Estate transfer - Inheritance for Sarah - 2025"
                className={`mt-2 ${errors.description ? 'border-red-500' : ''}`}
                data-testid="input-description"
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1" data-testid="error-description">
                  {errors.description}
                </p>
              )}
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
                disabled={addTransactionMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-add-transaction"
              >
                {addTransactionMutation.isPending ? "Adding..." : "Add Transaction"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
