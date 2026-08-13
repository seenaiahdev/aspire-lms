import React, { createContext, useContext, useState, ReactNode } from 'react';
import { currentUser as initialUser, User } from '@/data/mock';

interface UserContextType {
  user: User;
  updateUser: (updates: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(initialUser);

  const updateUser = (updates: Partial<User>) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...updates,
    }));
  };

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
