import { useDispatch, useSelector, useStore } from 'react-redux';

import type { AppDispatch, RootState } from './index';

/** Typed replacements for the raw react-redux hooks. Always use these. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<typeof import('./index').store>();
