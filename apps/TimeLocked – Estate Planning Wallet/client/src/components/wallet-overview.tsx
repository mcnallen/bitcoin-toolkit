import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, Unlock } from "lucide-react";

interface WalletOverviewProps {
  lockedTransactionCount: number;
  readyTransactionCount: number;
  onAddTimeLock: () => void;
}

export function WalletOverview({
  lockedTransactionCount,
  readyTransactionCount,
  onAddTimeLock,
}: WalletOverviewProps) {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Estate Planning Wallet</h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onAddTimeLock}
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                    data-testid="button-add-timelock"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Add TimeLock
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add nLockTime Script</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="text-orange-500 text-xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Locked Transactions</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="text-locked-count">
                  {lockedTransactionCount}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <Unlock className="text-green-600 text-xl mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Ready to Unlock</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="text-ready-count">
                  {readyTransactionCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
