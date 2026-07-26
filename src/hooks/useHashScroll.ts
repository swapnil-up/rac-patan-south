import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useHashScroll(loaded: boolean) {
  const location = useLocation();

  useEffect(() => {
    if (location.hash && loaded) {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.pathname, location.hash, loaded]);
}
