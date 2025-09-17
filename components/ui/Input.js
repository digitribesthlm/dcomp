import { clsx } from 'clsx'

export function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={clsx(
        'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export function Select({ children, className, ...props }) {
  return (
    <select
      className={clsx(
        'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

