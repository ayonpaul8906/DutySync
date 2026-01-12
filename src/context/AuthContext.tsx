import { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth"; //
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Role = "admin" | "driver" | null;

export const AuthContext = createContext<{
  user: User | null;
  role: Role;
  loading: boolean;
}>({
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", u.uid));
      setUser(u);
      setRole(snap.data()?.role ?? null);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
