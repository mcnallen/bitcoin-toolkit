import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, Plus, Info, Trash2, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { BitcoinAPI } from "@/lib/bitcoin";
import { LocalStorage } from "@/lib/localStorage";
import type { WatchAddress } from "@shared/schema";

interface WatchAddressesProps {
  addresses: WatchAddress[];
  onAddAddress: () => void;
}

export function WatchAddresses({ addresses, onAddAddress }: WatchAddressesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (addressId: string) => {
      LocalStorage.deleteWatchAddress(addressId);
      return { id: addressId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-addresses-local"] });
      toast({
        title: "Address Removed",
        description: "Watch address has been removed from your device",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to remove watch address",
        variant: "destructive",
      });
    },
  });

  const refreshBalanceMutation = useMutation({
    mutationFn: async (address: WatchAddress) => {
      const addressInfo = await BitcoinAPI.getAddressInfo(address.address);
      if (addressInfo) {
        const btcPrice = await BitcoinAPI.getBTCPrice();
        const balanceBTC = BitcoinAPI.satoshisToBTC(addressInfo.balance);
        const balanceUSD = btcPrice > 0 ? (parseFloat(balanceBTC) * btcPrice).toFixed(2) : "0";
        
        LocalStorage.updateWatchAddress(address.id, {
          balance: balanceBTC,
          balanceUsd: balanceUSD
        });
        
        return { balanceBTC, balanceUSD };
      }
      throw new Error("Failed to fetch address data");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-addresses-local"] });
      toast({
        title: "Balance Updated",
        description: "Address balance has been refreshed",
      });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh address balance",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Address copied successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Watch-Only Addresses
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>These addresses are monitored for incoming transactions but cannot be spent from</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {addresses.map((address) => (
          <div 
            key={address.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-600 transition-colors space-y-3"
            data-testid={`card-address-${address.id}`}
          >
            {/* Address and Action Buttons Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center min-w-0 flex-1">
                <div className="font-mono text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-md border break-all min-w-0 flex-1"
                     data-testid={`text-address-${address.id}`}>
                  {address.address}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(address.address)}
                  className="p-2 h-auto flex-shrink-0 ml-2"
                  data-testid={`button-copy-${address.id}`}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Action Buttons - Always visible, right-aligned */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshBalanceMutation.mutate(address)}
                  disabled={refreshBalanceMutation.isPending}
                  className="p-2 h-auto"
                  data-testid={`button-refresh-${address.id}`}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshBalanceMutation.isPending ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(address.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 h-auto text-red-600 hover:text-red-700"
                  data-testid={`button-delete-${address.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Info and Balance Row */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1" data-testid={`text-label-${address.id}`}>
                  {address.label}
                </p>
                <p className="text-xs text-gray-500" data-testid={`text-date-${address.id}`}>
                  Added: {new Date(address.addedDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900" data-testid={`text-balance-${address.id}`}>
                  {address.balance} BTC
                </p>
                <p className="text-sm text-gray-500" data-testid={`text-balance-usd-${address.id}`}>
                  ≈ ${address.balanceUsd} USD
                </p>
              </div>
            </div>
          </div>
        ))}
        
        <Button
          variant="outline"
          onClick={onAddAddress}
          className="w-full border-2 border-dashed border-gray-300 hover:border-blue-600 hover:text-blue-600 h-16"
          data-testid="button-add-watch-address-inline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Watch Address
        </Button>
      </CardContent>
    </Card>
  );
}
