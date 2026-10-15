import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";

const base =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-md font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  icon: "h-9 w-9",
};

export type Variant = keyof typeof variants;
export type Size = keyof typeof sizes;

/** Same classes as the design's Button; a caller's text size or justification replaces the default. */
export function buttonClass(variant: Variant = "default", size: Size = "default", extra = "") {
  const text = /\btext-(xs|sm|base|lg)\b/.test(extra) || size === "sm" ? "" : "text-sm";
  const justify = /\bjustify-/.test(extra) ? "" : "justify-center";
  return [base, justify, text, variants[variant], sizes[size], extra].filter(Boolean).join(" ");
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, Props>(({ variant, size, className, type = "button", ...rest }, ref) => (
  <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest} />
));
Button.displayName = "Button";

export function ButtonLink({ variant, size, className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
