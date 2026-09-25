import type { DateKey } from '@/domain/types';
import { useTheme } from '@/ui/theme';

/** Today's local date key, refreshed every minute by the theme clock. */
export function useToday(): DateKey {
  return useTheme().today;
}
