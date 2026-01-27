/**
 * Configuration for visit statuses
 * Used across the application for consistent status display
 */
export const VISIT_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  ZAPLANOWANA: { label: 'Zaplanowana', color: '#FF9500', bgColor: 'rgba(255, 149, 0, 0.1)' },
  ODBYTA: { label: 'Odbyta', color: '#34C759', bgColor: 'rgba(52, 199, 89, 0.1)' },
  NIEOBECNOSC: { label: 'Nieobecność', color: '#FF3B30', bgColor: 'rgba(255, 59, 48, 0.1)' },
  ANULOWANA: { label: 'Anulowana', color: '#8E8E93', bgColor: 'rgba(142, 142, 147, 0.1)' },
};

export type VisitStatus = keyof typeof VISIT_STATUS_CONFIG;
