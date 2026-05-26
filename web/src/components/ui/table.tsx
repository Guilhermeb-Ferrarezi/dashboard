"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// `variant="linear"` ativa um estilo dev-tool (Linear/Vercel): sem border-b
// permanente entre linhas, hover sutil, header column tiny uppercase.
// `default` mantém aparência shadcn original — zero impacto em tabelas
// que não optaram explicitamente pelo linear.
type TableVariant = "default" | "linear"

function Table({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"table"> & { variant?: TableVariant }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        data-variant={variant}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 [&_tr]:border-b",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/50 transition-colors duration-150 hover:bg-muted/40 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        // Variant linear (selector consulta data-variant=linear no ancestral <table>)
        "[[data-variant=linear]_&]:border-b-0 [[data-variant=linear]_&]:hover:bg-foreground/[0.03]",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0",
        // Variant linear: header coluna tiny com tracking aberto Linear-style.
        "[[data-variant=linear]_&]:h-9 [[data-variant=linear]_&]:text-[10px] [[data-variant=linear]_&]:tracking-[0.14em] [[data-variant=linear]_&]:text-muted-foreground/70",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        // Variant linear: padding vertical apertado pra alta densidade.
        "[[data-variant=linear]_&]:py-2.5",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
