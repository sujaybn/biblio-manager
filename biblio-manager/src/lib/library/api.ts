import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { UP_NEXT_TAG, type Book, type Genre, type Loan } from "./types";

export function useSession() {
  const [state, setState] = useState<{
    loading: boolean;
    email: string | null;
    userId: string | null;
  }>({ loading: true, email: null, userId: null });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({
        loading: false,
        email: data.session?.user.email ?? null,
        userId: data.session?.user.id ?? null,
      });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        loading: false,
        email: session?.user.email ?? null,
        userId: session?.user.id ?? null,
      });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Book[];
    },
  });
}

export function useGenres() {
  return useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genres")
        .select("*")
        .order("language")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Genre[];
    },
  });
}

export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("*, books(title, author, language)")
        .order("started_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Loan[];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["books"] });
    void qc.invalidateQueries({ queryKey: ["loans"] });
    void qc.invalidateQueries({ queryKey: ["genres"] });
  };
}

export function useSaveBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: Partial<Book> & { title: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const payload = { ...input, user_id: userId };
      const { data, error } = await supabase
        .from("books")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Book;
    },
    onSuccess: invalidate,
  });
}

export function useUploadCover() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Please pick an image under 5 MB.");

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("book-covers")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;

      const { data: signed, error: signErr } = await supabase.storage
        .from("book-covers")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Could not read that image.");
      return signed.signedUrl;
    },
  });
}

export function useDeleteBook() {

  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveLoan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: {
      book_id: string;
      direction: "lent" | "borrowed";
      counterparty: string;
      due_on?: string | null;
      note?: string | null;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { error } = await supabase
        .from("loans")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...input, user_id: userId } as any);
      if (error) throw error;
      if (input.direction === "borrowed") {
        await supabase.from("books").update({ shelf: "borrowed" }).eq("id", input.book_id);
      }
    },
    onSuccess: invalidate,
  });
}

export function useReturnLoan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (loan: Loan) => {
      const { error } = await supabase
        .from("loans")
        .update({ returned_on: new Date().toISOString().slice(0, 10) })
        .eq("id", loan.id);
      if (error) throw error;
      if (loan.direction === "borrowed") {
        await supabase.from("books").delete().eq("id", loan.book_id);
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteLoan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("loans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveGenre() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { name: string; language: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { error } = await supabase
        .from("genres")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...input, user_id: userId } as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteGenre() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("genres").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSeedLibrary() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("seed_my_library");
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateGenre() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; language: string; previousName: string }) => {
      const { error } = await supabase
        .from("genres")
        .update({ name: input.name, language: input.language })
        .eq("id", input.id);
      if (error) throw error;
      // keep books pointing at the renamed genre
      if (input.previousName !== input.name) {
        await supabase
          .from("books")
          .update({ genre: input.name })
          .eq("genre", input.previousName)
          .eq("language", input.language);
      }
    },
    onSuccess: invalidate,
  });
}

export function useToggleUpNext() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (book: Book) => {
      const tags = book.tags.includes(UP_NEXT_TAG)
        ? book.tags.filter((t) => t !== UP_NEXT_TAG)
        : [...book.tags, UP_NEXT_TAG];
      const { error } = await supabase.from("books").update({ tags }).eq("id", book.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveMargins() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { id: string; notes?: string | null; review?: string | null }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("books").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetReadingStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { id: string; reading_status: Book["reading_status"] }) => {
      const { error } = await supabase
        .from("books")
        .update({ reading_status: input.reading_status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateProgress() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { id: string; pages_read: number; page_count?: number | null }) => {
      const patch: { pages_read: number; page_count?: number } = {
        pages_read: input.pages_read,
      };
      if (input.page_count != null) patch.page_count = input.page_count;
      const { error } = await supabase.from("books").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
