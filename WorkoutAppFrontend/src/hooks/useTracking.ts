import { useGetTrainerQuery } from '@/api/endpoints/trainerApi';
import { shows } from '@/utils/tracking';

/**
 * What the signed-in coach tracks, for the screens that hide half the product.
 *
 * Backed by the same cached `GET /trainer` the dashboard already reads, so
 * calling it from several components costs nothing extra.
 */
export function useTracking() {
  const { data: trainer } = useGetTrainerQuery();
  const mode = trainer?.tracks ?? null;

  return {
    mode,
    workout: shows(mode, 'workout'),
    nutrition: shows(mode, 'nutrition'),
  };
}
