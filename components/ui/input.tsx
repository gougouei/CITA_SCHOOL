import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, required, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-[0.4rem]">
        {label && (
          <label htmlFor={id} className="text-[0.8rem] font-medium text-[#141414]">
            {label}
            {required && <span className="text-citsa-red-hex ml-[0.1rem]">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "font-sans text-sm bg-white text-[#141414] border border-border rounded-md px-[0.875rem] py-[0.55rem] h-10 w-full",
            "transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-[#9ca3af]",
            "focus:border-citsa-red-hex focus:shadow-[0_0_0_2px_rgba(201,29,29,0.15)]",
            error && "border-destructive focus:shadow-[0_0_0_2px_hsl(0,84%,60%,0.2)]",
            className
          )}
          {...props}
        />
        {hint && !error && <span className="text-[0.75rem] text-muted-fg">{hint}</span>}
        {error && <span className="text-[0.75rem] text-red-500">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-[0.4rem]">
        {label && (
          <label htmlFor={id} className="text-[0.8rem] font-medium text-[#141414]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "font-sans text-sm bg-white text-[#141414] border border-border rounded-md px-[0.875rem] py-[0.625rem] w-full min-h-[100px] resize-y",
            "transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-[#9ca3af]",
            "focus:border-citsa-red-hex focus:shadow-[0_0_0_2px_rgba(201,29,29,0.15)]",
            error && "border-destructive",
            className
          )}
          {...props}
        />
        {hint && !error && <span className="text-[0.75rem] text-muted-fg">{hint}</span>}
        {error && <span className="text-[0.75rem] text-red-500">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
