/** Link/button styling shared by the hero actions, resume pill, and contact form. */
const variants = {
  solid: 'bg-ink text-white hover:bg-accent active:bg-accent/85',
  outline:
    'border border-line-strong text-ink hover:border-accent hover:text-accent active:bg-accent-soft',
  light:
    'bg-[#f9f8f4] text-night hover:bg-[#b8abff] active:bg-white disabled:hover:bg-[#f9f8f4]',
};

const sizes = {
  md: 'min-h-[47px] px-5 text-sm',
  sm: 'px-3.5 py-2.5 text-[0.84rem]',
};

export default function Button({
  href,
  type = 'button',
  variant = 'solid',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      href={href}
      type={href ? undefined : type}
      className={`group inline-flex max-w-full cursor-pointer items-center justify-center gap-1.5 rounded-full text-center font-semibold transition-ui disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
