"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "@/components/ui/icons"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system", resolvedTheme } = useTheme()
  const sonnerTheme =
    theme === "onix" ? "dark" : resolvedTheme === "dark" ? "dark" : theme

  return (
    <Sonner
      theme={sonnerTheme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      position="bottom-right"
      offset={16}
      gap={10}
      duration={4500}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "color-mix(in oklch, var(--popover) 92%, oklch(0.7 0.18 145))",
          "--success-text": "var(--popover-foreground)",
          "--success-border": "color-mix(in oklch, var(--border) 60%, oklch(0.7 0.18 145))",
          "--error-bg": "color-mix(in oklch, var(--popover) 90%, var(--destructive))",
          "--error-text": "var(--popover-foreground)",
          "--error-border": "color-mix(in oklch, var(--border) 50%, var(--destructive))",
          "--warning-bg": "color-mix(in oklch, var(--popover) 90%, oklch(0.77 0.16 78))",
          "--warning-text": "var(--popover-foreground)",
          "--warning-border": "color-mix(in oklch, var(--border) 50%, oklch(0.77 0.16 78))",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] !backdrop-blur",
          title: "!font-medium !text-sm",
          description: "!text-xs !text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-muted !text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
