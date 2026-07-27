import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryClient";
import { currentUserId } from "@/stores/authStore";
import { normalizeBRPhone } from "@/lib/whatsapp";
import type { Client, ClientInput } from "@/types/domain";

/** Debounce so each keystroke doesn't hit the trigram index. */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Autocomplete lookup — backed by the GIN trigram index on clients.full_name. */
export function useClientSearch(term: string) {
  const debounced = useDebounced(term.trim(), 250);
  return useQuery({
    queryKey: queryKeys.clientSearch(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .ilike("full_name", `%${debounced}%`)
        .order("full_name")
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Full directory for the Clients page (optionally filtered). */
export function useClients(search = "") {
  const debounced = useDebounced(search.trim(), 250);
  return useQuery({
    queryKey: queryKeys.clientList(debounced),
    queryFn: async (): Promise<Client[]> => {
      let query = supabase.from("clients").select("*").order("full_name");
      if (debounced.length >= 2) query = query.ilike("full_name", `%${debounced}%`);
      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClientInput): Promise<Client> => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          full_name: input.full_name.trim(),
          phone: input.phone ? normalizeBRPhone(input.phone) : null,
          birthday: input.birthday || null,
          created_by: currentUserId(), // required by the clients_insert RLS policy
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clients }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ClientInput }): Promise<Client> => {
      const { data, error } = await supabase
        .from("clients")
        .update({
          full_name: input.full_name.trim(),
          phone: input.phone ? normalizeBRPhone(input.phone) : null,
          birthday: input.birthday || null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clients }),
  });
}

/** Admin-only per RLS (clients_delete_admin). */
export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clients }),
  });
}
