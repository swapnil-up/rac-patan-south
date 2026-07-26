import { createContext, useContext } from "react";

interface NavigateContextValue {
  navigate: (to: string) => void;
}

export const NavigateContext = createContext<NavigateContextValue>({ navigate: () => {} });

export const useNavigate = () => useContext(NavigateContext);
