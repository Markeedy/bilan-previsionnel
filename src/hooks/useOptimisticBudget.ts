import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBudgetStore } from '../store/useBudgetStore';
import { BudgetItem } from '../types/budget';

const QUERY_KEY = ['khemisti_budget_items'];

export function useOptimisticBudget() {
  const queryClient = useQueryClient();
  const { items, updateItemField } = useBudgetStore();

  // Query to get items
  const { data = items, isLoading } = useQuery<BudgetItem[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // In real backend, this calls Supabase: supabase.from('market_items').select('*')
      return useBudgetStore.getState().items;
    },
    initialData: items,
  });

  // Mutation for updating a single field with optimistic snapshot and rollback
  const mutation = useMutation({
    mutationFn: async ({
      itemId,
      field,
      value,
    }: {
      itemId: string;
      field: 'unitPrice' | 'contractQuantity' | 'previousQuantity' | '2026-10' | '2026-11' | '2026-12';
      value: number;
    }) => {
      // Execute the Zustand update
      const res = updateItemField(itemId, field, value);
      if (!res.success) {
        throw new Error(res.message || 'Erreur de validation');
      }
      return useBudgetStore.getState().items;
    },
    onMutate: async ({ itemId, field, value }) => {
      // 1. Cancel ongoing queries for the budget items
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });

      // 2. Snapshot the previous value
      const previousSnapshot = queryClient.getQueryData<BudgetItem[]>(QUERY_KEY) || items;

      // 3. Optimistically update query cache
      queryClient.setQueryData<BudgetItem[]>(QUERY_KEY, (old) => {
        if (!old) return old;
        return old.map((it) => {
          if (it.id !== itemId) return it;
          const copy = { ...it };
          if (field === 'unitPrice') copy.unitPrice = value;
          else if (field === 'contractQuantity') copy.contractQuantity = value;
          else if (field === 'previousQuantity') copy.previousQuantity = value;
          else if (field === '2026-10' || field === '2026-11' || field === '2026-12') {
            copy.forecasts = { ...copy.forecasts, [field]: value };
          }
          return copy;
        });
      });

      // Return context with snapshot
      return { previousSnapshot };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousSnapshot) {
        queryClient.setQueryData(QUERY_KEY, context.previousSnapshot);
      }
      console.error('Erreur mutation budgétaire:', err);
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    items: data,
    isLoading,
    updateField: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
