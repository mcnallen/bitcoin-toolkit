import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validateBitcoinAddress } from "@/lib/bitcoin";
import { watchAddressStorage } from "@/lib/localStorage";

interface AddWatchAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWatchAddressModal({ open, onOpenChange }: AddWatchAddressModalProps) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState({ address: "", label: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addAddressMutation = useMutation({
    mutationFn: async (data: { address: string; label: string }) => {
      const newAddress = watchAddressStorage.add({
        address: data.address,
        label: data.label,
        balance: "0.00000000",
        balanceUsd: "0.00",
      });
      return newAddress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-addresses-local"] });
      toast({
        title: "Address Added",
        description: "Watch-only address has been saved to your device",
      });
      onOpenChange(false);
      setAddress("");
      setLabel("");
      setErrors({ address: "", label: "" });
    },
    onError: () => {
      toast({
        title: "Failed to Add Address",
        description: "Please check your input and try again",
        variant: "destructive",
      });
    },
  });

  const validateForm = () => {
    const newErrors = { address: "", label: "" };
    let isValid = true;

    if (!address.trim()) {
      newErrors.address = "Bitcoin address is required";
      isValid = false;
    } else if (!validateBitcoinAddress(address.trim())) {
      newErrors.address = "Invalid Bitcoin address format";
      isValid = false;
    }

    if (!label.trim()) {
      newErrors.label = "Label is required";
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

    addAddressMutation.mutate({
      address: address.trim(),
      label: label.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-add-watch-address" aria-describedby="add-address-description">
        <DialogHeader>
          <DialogTitle>Add Watch-Only Address</DialogTitle>
          <p id="add-address-description" className="text-sm text-gray-600 mt-2">
            Add a Bitcoin address to monitor its balance and transactions without being able to spend from it.
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="address" className="text-sm font-medium text-gray-700">
              Bitcoin Address or Public Key
            </Label>
            <Input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3lts"
              className={`mt-2 ${errors.address ? 'border-red-500' : ''}`}
              data-testid="input-bitcoin-address"
            />
            {errors.address && (
              <p className="text-sm text-red-600 mt-1" data-testid="error-address">
                {errors.address}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="label" className="text-sm font-medium text-gray-700">
              Label
            </Label>
            <Input
              id="label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Primary Estate Address"
              className={`mt-2 ${errors.label ? 'border-red-500' : ''}`}
              data-testid="input-address-label"
            />
            {errors.label && (
              <p className="text-sm text-red-600 mt-1" data-testid="error-label">
                {errors.label}
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
              disabled={addAddressMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-add-address"
            >
              {addAddressMutation.isPending ? "Adding..." : "Add Address"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
