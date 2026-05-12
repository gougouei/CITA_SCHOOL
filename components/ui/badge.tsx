import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-sans text-[0.72rem] font-semibold tracking-[0.04em] px-[0.6rem] py-[0.2rem] rounded-full uppercase",
  {
    variants: {
      variant: {
        default: "bg-citsa-black text-white",
        accent: "bg-citsa-red-hex text-white",
        secondary: "bg-secondary text-[#141414] border border-border",
        muted: "bg-muted-bg text-muted-fg",
        outline: "bg-transparent border border-border text-muted-fg",
        success: "bg-[hsl(142,70%,35%,0.12)] text-[hsl(142,70%,30%)]",
        warning: "bg-[hsl(38,90%,50%,0.15)] text-[hsl(38,70%,30%)]",
        destructive: "bg-[hsl(0,84%,60%,0.12)] text-[hsl(0,84%,40%)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
