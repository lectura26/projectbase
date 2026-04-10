"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "!bg-primary !text-on-primary !border !border-primary shadow-lg font-body [&_[data-description]]:!text-on-primary/85",
          title: "!text-on-primary !font-medium",
          description: "!text-on-primary/85",
          actionButton: "!bg-on-primary !text-primary",
          cancelButton: "!bg-white/15 !text-on-primary",
          closeButton:
            "!text-on-primary hover:!bg-white/10 !border-0 !bg-transparent",
          error: "!bg-primary !text-on-primary",
          success: "!bg-primary !text-on-primary",
          warning: "!bg-primary !text-on-primary",
          info: "!bg-primary !text-on-primary",
        },
      }}
    />
  );
}
