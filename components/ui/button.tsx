import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-sans font-medium text-sm transition-all duration-150 cursor-pointer no-underline disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-citsa-red-hex focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        accent: "bg-citsa-red-hex text-white hover:bg-citsa-red-light rounded-md",
        primary: "bg-citsa-black text-white hover:bg-[#2a2a2a] rounded-md",
        secondary: "bg-secondary text-[#141414] border border-border hover:bg-muted-bg rounded-md",
        outline: "bg-transparent text-[#141414] border border-border hover:bg-muted-bg rounded-md",
        ghost: "bg-transparent text-white border border-white/20 hover:bg-white/10 rounded-md",
        destructive: "bg-destructive text-white hover:bg-red-600 rounded-md",
      },
      size: {
        sm: "px-[0.875rem] py-[0.4rem] text-[0.8rem]",
        default: "px-5 py-[0.625rem]",
        lg: "px-7 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
