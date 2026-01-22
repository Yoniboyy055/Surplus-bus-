import { Badge } from "./Badge";

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  masked?: boolean;
}

export const StatusPill = ({ status, size = 'md', className = '', masked = false }: StatusPillProps) => {
  // Map internal status enums to friendly text and colors
  // If masked is true, we hide sensitive non-terminal statuses
  
  const getStatusConfig = (s: string) => {
    // 7️⃣ Referrer Privacy: Mask all non-terminal statuses
    if (masked) {
      const terminalStatuses = ['CLOSED_PAID', 'LOST', 'WITHDRAWN'];
      if (!terminalStatuses.includes(s)) {
        return { label: 'Active Deal', variant: 'warning' as const };
      }
    }

    switch (s) {
      case 'NEW_SUBMISSION':
        return { label: 'New', variant: 'info' as const };
      case 'NEEDS_CLARIFICATION':
        return { label: 'Needs Info', variant: 'warning' as const };
      case 'QUALIFIED':
        return { label: 'Qualified', variant: 'default' as const }; // Purple-ish
      case 'MATCHING':
        return { label: 'Matching', variant: 'info' as const }; // Cyan-ish
      case 'BUYER_COMMITTED':
        return { label: 'Buyer Committed', variant: 'success' as const };
      case 'WON_PENDING_CLOSE':
        return { label: 'Closing', variant: 'success' as const };
      case 'CLOSED_PAID':
        return { label: 'Closed & Paid', variant: 'success' as const };
      case 'REJECTED':
      case 'LOST':
      case 'WITHDRAWN':
        return { label: s.replace('_', ' '), variant: 'error' as const };
      case 'EXCLUSIVE_WINDOW_ACTIVE':
         return { label: 'Exclusive', variant: 'warning' as const };
      default:
        return { label: s.replace(/_/g, ' '), variant: 'default' as const };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} size={size} className={`whitespace-nowrap ${className}`}>
      {config.label}
    </Badge>
  );
};
