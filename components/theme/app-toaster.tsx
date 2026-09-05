"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

export default function AppToaster() {
  const { theme } = useTheme();

  return <Toaster position="top-right" theme={theme} richColors closeButton />;
}
