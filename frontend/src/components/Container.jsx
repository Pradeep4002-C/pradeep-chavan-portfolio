/** Shared max-width and responsive page padding for every section. */
export default function Container({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag
      className={`mx-auto w-full max-w-content px-5 sm:px-8 lg:px-12 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
