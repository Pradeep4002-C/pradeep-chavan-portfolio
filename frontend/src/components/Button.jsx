/** Link/button styling shared by the hero actions and the resume pill. */
const variants = {
  solid: 'bg-ink text-white hover:bg-accent active:bg-accent/85',
  outline:
    'border border-line-strong text-ink hover:border-accent hover:text-accent active:bg-accent-soft',
};

const sizes = {
  md: 'min-h-[47px] px-5 text-sm',
  sm: 'px-3.5 py-2.5 text-[0.84rem]',
};

export default function Button({
  href,
  variant = 'solid',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  return (
    <a
      href={href}
      className={`group inline-flex max-w-full cursor-pointer items-center justify-center gap-1.5 rounded-full text-center font-semibold transition-ui ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}
