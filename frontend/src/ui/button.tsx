import * as React from "react";
import { cn } from "@/lib/util";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                "px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800",
                className
                )}
                {...props}
            />
            );
    }
);

Button.displayName = "Button";

export { Button };