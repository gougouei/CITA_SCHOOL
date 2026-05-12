import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "rounded-lg px-[1.1rem] py-[0.875rem] text-sm flex items-start gap-3 border",
  {
    variants: {
      variant: {
        default: "bg-secondary border-border text-[#141414]",
        success:
          "bg-[hsl(142,70%,35%,0.08)] border-[hsl(142,70%,35%,0.25)] text-[hsl(142,60%,25%)]",
        warning:
          "bg-[hsl(38,90%,50%,0.08)] border-[hsl(38,90%,50%,0.3)] text-[hsl(38,70%,25%)]",
        destructive:
          "bg-[hsl(0,84%,60%,0.08)] border-[hsl(0,84%,60%,0.25)] text-[hsl(0,70%,35%)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  icon?: React.ReactNode;
}

function Alert({ className, variant, title, icon, children, ...props }: AlertProps) {
  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      {icon && <span className="w-4 h-4 flex-shrink-0 mt-[1px]">{icon}</span>}
      <div>
        {title && <strong className="block font-semibold mb-[0.2rem]">{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export { Alert, alertVariants };
