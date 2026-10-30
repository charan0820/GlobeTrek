import React, { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api.js";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const client = useQueryClient();
  async function replaceSession(user) {
    await client.cancelQueries();
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== "session",
    });
    client.setQueryData(["session"], user);
  }
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return (await api("/auth/me")).data;
      } catch (e) {
        if (e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 60000,
  });
  return (
    <AuthContext.Provider
      value={{
        user: session.data,
        checking: session.isPending,
        error: session.error,
        retry: session.refetch,
        setUser: replaceSession,
        logout: async () => {
          await api("/auth/logout", { method: "POST" });
          await replaceSession(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
