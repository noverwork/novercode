import { useContext } from "react";
import { UpdateContext, type UpdateContextValue } from "@/stores/UpdateContext";

export function useUpdate(): UpdateContextValue {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error("useUpdate must be used within an UpdateProvider");
  }
  return context;
}
