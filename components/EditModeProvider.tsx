"use client";
import { createContext, useContext, useState } from "react";

interface EditModeContextValue {
  editMode: boolean;
  toggle: () => void;
}

const EditModeContext = createContext<EditModeContextValue>({
  editMode: false,
  toggle: () => {},
});

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  const toggle = () => setEditMode((v) => !v);
  return (
    <EditModeContext.Provider value={{ editMode, toggle }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode(): EditModeContextValue {
  return useContext(EditModeContext);
}
