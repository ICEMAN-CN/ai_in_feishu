interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'loading';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    connected: { label: 'Connected', className: 'bg-green-100 text-green-800' },
    disconnected: { label: 'Disconnected', className: 'bg-red-100 text-red-800' },
    loading: { label: 'Loading...', className: 'bg-gray-100 text-gray-800' },
  };

  const { label, className } = config[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
