import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { EstateInstruction } from "@shared/schema";

interface AddInstructionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instruction?: EstateInstruction | null;
}

export function AddInstructionModal({ 
  open, 
  onOpenChange, 
  instruction 
}: AddInstructionModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState({ title: "", content: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEditing = !!instruction;

  useEffect(() => {
    if (instruction) {
      setTitle(instruction.title);
      setContent(instruction.content);
    } else {
      setTitle("");
      setContent("");
    }
    setErrors({ title: "", content: "" });
  }, [instruction, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      if (isEditing) {
        const response = await apiRequest("PATCH", `/api/estate-instructions/${instruction.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/estate-instructions", data);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estate-instructions"] });
      toast({
        title: isEditing ? "Instruction Updated" : "Instruction Added",
        description: `Estate instruction has been successfully ${isEditing ? 'updated' : 'added'}`,
      });
      onOpenChange(false);
      setTitle("");
      setContent("");
      setErrors({ title: "", content: "" });
    },
    onError: () => {
      toast({
        title: `Failed to ${isEditing ? 'Update' : 'Add'} Instruction`,
        description: "Please check your input and try again",
        variant: "destructive",
      });
    },
  });

  const validateForm = () => {
    const newErrors = { title: "", content: "" };
    let isValid = true;

    if (!title.trim()) {
      newErrors.title = "Title is required";
      isValid = false;
    }

    if (!content.trim()) {
      newErrors.content = "Content is required";
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

    saveMutation.mutate({
      title: title.trim(),
      content: content.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="modal-add-instruction" aria-describedby="add-instruction-description">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Instruction" : "Add Estate Planning Instruction"}
          </DialogTitle>
          <p id="add-instruction-description" className="text-sm text-gray-600 mt-2">
            {isEditing 
              ? "Update the estate planning instructions for your beneficiaries."
              : "Create detailed instructions for your beneficiaries on how to access and manage your Bitcoin assets."
            }
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Title
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Primary Wallet Access"
              className={`mt-2 ${errors.title ? 'border-red-500' : ''}`}
              data-testid="input-instruction-title"
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1" data-testid="error-title">
                {errors.title}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="content" className="text-sm font-medium text-gray-700">
              Instructions
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter detailed instructions for beneficiaries..."
              rows={6}
              className={`mt-2 ${errors.content ? 'border-red-500' : ''}`}
              data-testid="input-instruction-content"
            />
            {errors.content && (
              <p className="text-sm text-red-600 mt-1" data-testid="error-content">
                {errors.content}
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
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-instruction"
            >
              {saveMutation.isPending 
                ? (isEditing ? "Updating..." : "Adding...") 
                : (isEditing ? "Update" : "Add Instruction")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
