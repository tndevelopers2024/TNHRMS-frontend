import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : "button"
  
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    gradient: "bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-white border-2 border-primary text-primary hover:bg-primary/5",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  }

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
