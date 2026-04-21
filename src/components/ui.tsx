import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger',
  size?: 'sm' | 'md' | 'lg'
}) {
  const variants = {
    primary: "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-100",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    outline: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    ghost: "bg-transparent hover:bg-slate-50 text-slate-500",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )} 
      {...props} 
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)} 
      {...props} 
    />
  );
}

export function Badge({ 
  className, 
  variant = 'default', 
  ...props 
}: React.HTMLAttributes<HTMLSpanElement> & { 
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}) {
  const variants = {
    default: "bg-slate-100 text-slate-800",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-red-100 text-red-700", // Using red for warning/medium
    error: "bg-red-200 text-red-800",
    info: "bg-blue-100 text-blue-700"
  };

  return (
    <span 
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)} 
      {...props} 
    />
  );
}
