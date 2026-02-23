import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Settings, HelpCircle, RefreshCw, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HeaderInfo } from "@/components/header-info";
import { WalletOverview } from "@/components/wallet-overview";

import { TimeLockedTransactions } from "@/components/time-locked-transactions";
import { EstateInstructions } from "@/components/estate-instructions";

import { AddTimeLockModal } from "@/components/add-timelock-modal-simplified";
import { AddInstructionModal } from "@/components/add-instruction-modal";
import { watchAddressStorage, timeLockedTransactionStorage, estateInstructionStorage } from "@/lib/localStorage";
import type { WatchAddress, TimeLockedTransaction, EstateInstruction } from "@shared/schema";

export default function Wallet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddTimeLock, setShowAddTimeLock] = useState(false);
  const [showAddInstruction, setShowAddInstruction] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<EstateInstruction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<TimeLockedTransaction | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { data: watchAddresses = [], isLoading: loadingAddresses } = useQuery<WatchAddress[]>({
    queryKey: ["watch-addresses-local"],
    queryFn: () => {
      console.log("Fetching watch addresses from localStorage");
      return watchAddressStorage.getAll();
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const { data: timeLockedTransactions = [], isLoading: loadingTransactions } = useQuery<TimeLockedTransaction[]>({
    queryKey: ["time-locked-transactions-local"],
    queryFn: async () => {
      console.log("Fetching transactions from localStorage");
      // Fetch current block height for readiness calculation
      let currentBlockHeight: number | undefined;
      try {
        const response = await fetch('https://blockstream.info/api/blocks/tip/height');
        if (response.ok) {
          currentBlockHeight = await response.json();

        }
      } catch (error) {
        console.error('Failed to fetch block height for readiness calculation:', error);
      }
      
      const transactions = timeLockedTransactionStorage.getAll(currentBlockHeight);
      console.log("Retrieved transactions:", transactions);
      

      return transactions;
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
    refetchInterval: false,
  });

  const { data: estateInstructions = [], isLoading: loadingInstructions } = useQuery<EstateInstruction[]>({
    queryKey: ["estate-instructions-local"],
    queryFn: () => {
      console.log("Fetching estate instructions from localStorage");
      return estateInstructionStorage.getAll();
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const lockedTransactionCount = timeLockedTransactions.filter(tx => !tx.isReady).length;
  const readyTransactionCount = timeLockedTransactions.filter(tx => tx.isReady && tx.status !== "BROADCASTED").length;

  const handleEditInstruction = (instruction: EstateInstruction) => {
    setEditingInstruction(instruction);
    setShowAddInstruction(true);
  };

  const handleEditTransaction = (transaction: TimeLockedTransaction) => {
    setEditingTransaction(transaction);
    setShowAddTimeLock(true);
  };

  const handleCloseTimeLockModal = () => {
    setShowAddTimeLock(false);
    setEditingTransaction(null);
  };

  // Function to refresh all monitored address balances
  const refreshAllBalances = async () => {
    try {
      toast({
        title: "Refreshing Balances",
        description: "Updating all monitored address balances...",
      });

      // Force refresh all addresses by triggering balance updates
      queryClient.invalidateQueries({ queryKey: ["watch-addresses-local"] });
      
      // Small delay to let the updates process
      setTimeout(() => {
        toast({
          title: "Balances Updated",
          description: "All monitored address balances have been refreshed",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh all address balances",
        variant: "destructive",
      });
    }
  };

  const handleCloseInstructionModal = () => {
    setShowAddInstruction(false);
    setEditingInstruction(null);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    // Add a small delay to show the loading state
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Auto-refresh every 5 minutes when enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, queryClient]);

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      
      const walletData = {
        watchAddresses: watchAddressStorage.getAll(),
        timeLockedTransactions: timeLockedTransactionStorage.getAll(),
        estateInstructions: estateInstructionStorage.getAll(),
        exportDate: new Date().toISOString(),
        version: "1.0"
      };

      const dataStr = JSON.stringify(walletData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timelocked-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your wallet data has been downloaded as a backup file.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export wallet data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Validate the structure
      if (!importedData.watchAddresses || !importedData.timeLockedTransactions || !importedData.estateInstructions) {
        throw new Error("Invalid backup file format");
      }

      // Debug logging for import data structure
      console.log('Importing data:', {
        addresses: importedData.watchAddresses.length,
        transactions: importedData.timeLockedTransactions.length,
        instructions: importedData.estateInstructions.length
      });

      // Import the data, handling potential duplicates
      let importedCount = { addresses: 0, transactions: 0, instructions: 0 };
      
      importedData.watchAddresses.forEach((addr: any) => {
        try {
          // Check if address already exists
          const existing = watchAddressStorage.getAll().find(a => a.address === addr.address);
          if (!existing) {
            // Remove ID to let storage assign new one, and ensure proper date conversion
            const addressToAdd = {
              ...addr,
              addedDate: new Date(addr.addedDate)
            };
            delete addressToAdd.id;
            watchAddressStorage.add(addressToAdd);
            importedCount.addresses++;
          }
        } catch (error) {
          console.warn('Failed to import address:', addr.address, error);
        }
      });
      
      importedData.timeLockedTransactions.forEach((tx: any) => {
        try {
          // Check if transaction already exists
          const existing = timeLockedTransactionStorage.getAll().find(t => t.id === tx.id);
          if (!existing) {
            // Ensure proper date conversion
            const transactionToAdd = {
              ...tx,
              unlockDate: tx.unlockDate ? new Date(tx.unlockDate) : null,
              createdDate: new Date(tx.createdDate),
              lastBroadcastAttempt: tx.lastBroadcastAttempt ? new Date(tx.lastBroadcastAttempt) : null
            };
            delete transactionToAdd.id;
            timeLockedTransactionStorage.add(transactionToAdd);
            importedCount.transactions++;
          }
        } catch (error) {
          console.warn('Failed to import transaction:', tx.id, error);
        }
      });
      
      importedData.estateInstructions.forEach((inst: any) => {
        try {
          // Check if instruction already exists
          const existing = estateInstructionStorage.getAll().find(i => i.id === inst.id);
          if (!existing) {
            // Ensure proper date conversion
            const instructionToAdd = {
              ...inst,
              lastUpdated: new Date(inst.lastUpdated)
            };
            delete instructionToAdd.id;
            estateInstructionStorage.add(instructionToAdd);
            importedCount.instructions++;
          }
        } catch (error) {
          console.warn('Failed to import instruction:', inst.id, error);
        }
      });

      // Refresh queries to show imported data
      queryClient.invalidateQueries();

      toast({
        title: "Data Imported",
        description: `Successfully imported ${importedCount.addresses} addresses, ${importedCount.transactions} transactions, and ${importedCount.instructions} instructions.`,
      });

      setShowSettings(false);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import wallet data. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0">
              <Shield className="text-blue-600 text-2xl mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">TimeLocked</h1>
                <p className="text-xs sm:text-sm font-medium text-gray-700 -mt-1">Bitcoin nLockTime inheritance vault</p>
              </div>
              <Badge className="ml-2 sm:ml-3 bg-green-100 text-green-800 text-xs sm:text-sm" data-testid="badge-mainnet">
                MAINNET
              </Badge>
              <div className="hidden sm:block ml-3">
                <HeaderInfo />
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                data-testid="button-refresh" 
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" data-testid="button-help" onClick={() => setShowHelp(true)} className="p-2">
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <Button variant="ghost" size="sm" data-testid="button-settings" onClick={() => setShowSettings(true)} className="p-2">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <WalletOverview

          lockedTransactionCount={lockedTransactionCount}
          readyTransactionCount={readyTransactionCount}

          onAddTimeLock={() => setShowAddTimeLock(true)}
        />

        <div className="grid grid-cols-1 gap-6 lg:gap-8">
          <TimeLockedTransactions
            transactions={timeLockedTransactions}
            onAddTransaction={() => setShowAddTimeLock(true)}
            onEditTransaction={handleEditTransaction}
          />
        </div>

        <EstateInstructions
          instructions={estateInstructions}
          onAddInstruction={() => setShowAddInstruction(true)}
          onEditInstruction={handleEditInstruction}
        />
      </div>



      <AddTimeLockModal
        open={showAddTimeLock}
        onOpenChange={handleCloseTimeLockModal}
        transaction={editingTransaction}
      />

      <AddInstructionModal
        open={showAddInstruction}
        onOpenChange={handleCloseInstructionModal}
        instruction={editingInstruction}
      />

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="mx-4 sm:max-w-md w-[calc(100%-2rem)] sm:w-full" data-testid="dialog-settings">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your wallet preferences and refresh settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-refresh">Auto Refresh</Label>
                <p className="text-sm text-gray-500">
                  Automatically refresh wallet data every 5 minutes
                </p>
              </div>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                data-testid="switch-auto-refresh"
              />
            </div>
            <Separator />
            <div className="space-y-4">
              <div>
                <Label>Wallet Data Backup</Label>
                <p className="text-sm text-gray-500 mb-3">Export or import your wallet data for safekeeping</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="flex items-center gap-2"
                    data-testid="button-export-data"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? "Exporting..." : "Export Data"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="flex items-center gap-2"
                    data-testid="button-import-data"
                  >
                    <Upload className="w-4 h-4" />
                    {isImporting ? "Importing..." : "Import Data"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                    data-testid="input-import-file"
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Network</Label>
              <p className="text-sm text-gray-500">Currently connected to Bitcoin Mainnet</p>
              <Badge className="bg-green-100 text-green-800" data-testid="badge-network-status">
                MAINNET - CONNECTED
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="mx-4 sm:max-w-2xl w-[calc(100%-2rem)] sm:w-full max-h-[80vh] overflow-y-auto" data-testid="dialog-help">
          <DialogHeader>
            <DialogTitle>TimeLocked Help</DialogTitle>
            <DialogDescription>
              Learn how to use your Bitcoin estate planning wallet effectively.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">How TimeLocked Works</h3>
              <p className="text-sm text-gray-600 mb-3">
                TimeLocked is a Bitcoin estate planning wallet that stores pre-signed time-locked transactions for inheritance scenarios. 
                All data is stored locally on your device for maximum privacy and security.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Universal wallet compatibility - works with Electrum, Bitcoin Core, hardware wallets</li>
                <li>• Supports all Bitcoin address types (Legacy, P2SH, SegWit, Taproot)</li>
                <li>• Manual transaction broadcasting with user control</li>
                <li>• Real-time Bitcoin network monitoring</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Time-Locked Transactions</h3>
              <p className="text-sm text-gray-600 mb-3">
                Store raw signed transaction data from any Bitcoin wallet. Transactions automatically become ready for broadcast when their unlock conditions are met.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Timestamp Locks:</strong> Unlock at specific dates and times</li>
                <li>• <strong>Block Height Locks:</strong> Unlock when Bitcoin reaches a target block number</li>
                <li>• <strong>Manual Broadcasting:</strong> Click "Broadcast Now" when transactions are ready</li>
                <li>• <strong>Address Monitoring:</strong> Optional tracking of from/to addresses for balance updates</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Creating Time-Locked Transactions</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use your preferred wallet (Electrum, etc.) to create a transaction with nTimeLock</li>
                <li>• Sign the transaction but don't broadcast it</li>
                <li>• Copy the raw transaction hex and paste it into TimeLocked</li>
                <li>• The wallet automatically extracts locktime, amount, and address data</li>
                <li>• Add description and monitoring addresses for estate planning</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Estate Instructions</h3>
              <p className="text-sm text-gray-600">
                Document step-by-step instructions for your beneficiaries. Include wallet access details, 
                private key locations, and specific distribution plans to ensure smooth inheritance execution.
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Data Management</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Local Storage:</strong> All data stored on your device locally</li>
                <li>• <strong>Backup:</strong> Export all wallet data to JSON files for safekeeping</li>
                <li>• <strong>Restore:</strong> Import backup files to recover your estate planning setup</li>
                <li>• <strong>Privacy:</strong> No accounts, no registration</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-600">Security & Legal Disclaimer</h3>
              <div className="text-xs text-gray-600 space-y-2 bg-gray-50 p-3 rounded-md">
                <p>
                  <strong>TimeLocked is a non-custodial Bitcoin estate planning tool intended for educational and informational purposes only.</strong> It does not store, generate, or manage private keys, and it does not hold or transfer Bitcoin. TimeLocked simply stores public information and pre-signed, time-locked transactions, which users may choose to broadcast when conditions are met.
                </p>
                <p>
                  <strong>No Private Key Access:</strong> TimeLocked does not store, access, or require private keys, seed phrases, or wallet credentials. All transaction signing must be performed using external wallets under your control.
                </p>
                <p>
                  <strong>User-Created Transactions:</strong> All transactions are created and signed by the user outside of the app. TimeLocked does not verify their correctness or guarantee successful broadcasting.
                </p>
                <p>
                  <strong>Manual Broadcasting:</strong> Transactions are never broadcast automatically. Users must manually confirm and broadcast transactions when they become valid.
                </p>
                <p>
                  <strong>Local Storage & Device Security:</strong> All data — including signed transactions, monitoring addresses, and estate notes — is stored locally and unencrypted on your device.
                </p>
                <p>
                  A signed Bitcoin transaction (i.e., the raw transaction hex) is cryptographically sealed and contains no private keys. It cannot be modified or used to spend other funds, making it generally safe to store or share — even before it is broadcast. While addresses, amounts, and timing details included in signed transactions are considered public information, we still recommend using TimeLocked on a secure and trusted device to avoid unwanted access or privacy exposure.
                </p>
                <p>
                  <strong>No Warranties or Guarantees:</strong> This software does not guarantee that stored transactions will remain valid, accepted by the Bitcoin network, or usable in the future.
                </p>
                <p>
                  <strong>Not a Wallet:</strong> TimeLocked is not a Bitcoin wallet. It does not hold balances or enable spending. It is a planning and monitoring tool only.
                </p>
                <p>
                  <strong>No Legal or Financial Advice:</strong> TimeLocked does not provide legal, financial, or tax advice. Users should consult professionals to ensure their estate plans are compliant and effective.
                </p>
                <p>
                  <strong>Use at Your Own Risk:</strong> By using this software, you accept full responsibility for all outcomes, including data loss, transaction failure, or incomplete inheritance execution.
                </p>
                <p className="font-semibold">
                  TimeLocked is designed to educate and assist users in organizing Bitcoin estate plans. It should not be relied upon as a sole or guaranteed method for securing inheritance transfers.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Bitcoin nLockTime inheritance vault</h3>
            <p className="text-lg text-gray-300 mb-3">Plan your legacy with time-locked Bitcoin transactions.</p>
            <p className="text-sm text-gray-400 max-w-2xl mx-auto">
              Non-custodial Bitcoin vault for inheritance planning. Store signed, time-locked transactions that unlock when the time comes.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
