import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { EstateInstruction } from "@shared/schema";

interface EstateInstructionsProps {
  instructions: EstateInstruction[];
  onAddInstruction: () => void;
  onEditInstruction: (instruction: EstateInstruction) => void;
}

export function EstateInstructions({ 
  instructions, 
  onAddInstruction, 
  onEditInstruction 
}: EstateInstructionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (instructionId: string) => {
      await apiRequest("DELETE", `/api/estate-instructions/${instructionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estate-instructions"] });
      toast({
        title: "Instruction Deleted",
        description: "Estate instruction has been successfully deleted",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete estate instruction",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="mt-8">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Estate Planning Instructions
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Important notes and instructions for beneficiaries
        </p>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {instructions.map((instruction) => (
            <div 
              key={instruction.id}
              className="border border-gray-200 rounded-lg p-4"
              data-testid={`card-instruction-${instruction.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-medium text-gray-900" data-testid={`text-title-${instruction.id}`}>
                  {instruction.title}
                </h4>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditInstruction(instruction)}
                    className="p-1 h-auto"
                    data-testid={`button-edit-${instruction.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(instruction.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1 h-auto text-red-600 hover:text-red-700"
                    data-testid={`button-delete-${instruction.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3" data-testid={`text-content-${instruction.id}`}>
                {instruction.content}
              </p>
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="w-3 h-3 mr-1" />
                <span data-testid={`text-updated-${instruction.id}`}>
                  Updated: {new Date(instruction.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={onAddInstruction}
            className="border-2 border-dashed border-gray-300 hover:border-blue-600 hover:text-blue-600 h-32"
            data-testid="button-add-instruction"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Instruction
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
