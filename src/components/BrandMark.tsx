export default function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-brand-mark="void"
    >
      <path d="M23.5 8.5a10.6 10.6 0 1 1-15 0L16 19.5 23.5 8.5Z" />
    </svg>
  )
}
