'use client';

import { useCallback, useEffect, useState } from 'react';

export type AssemblyView = 'list' | 'board';

const STORAGE_KEY = 'assembly:view';
const BOARD_MIN_WIDTH = 768;

function readStoredView(): AssemblyView {
  if (typeof window === 'undefined') return 'list';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'board' ? 'board' : 'list';
  } catch {
    return 'list';
  }
}

function writeStoredView(view: AssemblyView): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Ignore quota / private-mode errors.
  }
}

function isViewportBoardCapable(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BOARD_MIN_WIDTH;
}

export function useAssemblyView(): {
  view: AssemblyView;
  storedView: AssemblyView;
  boardAvailable: boolean;
  setView: (view: AssemblyView) => void;
} {
  const [storedView, setStoredView] = useState<AssemblyView>('list');
  const [boardAvailable, setBoardAvailable] = useState(false);

  useEffect(() => {
    setStoredView(readStoredView());
    setBoardAvailable(isViewportBoardCapable());

    const onResize = () => setBoardAvailable(isViewportBoardCapable());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setView = useCallback((next: AssemblyView) => {
    setStoredView(next);
    writeStoredView(next);
  }, []);

  const effective: AssemblyView =
    storedView === 'board' && boardAvailable ? 'board' : 'list';

  return { view: effective, storedView, boardAvailable, setView };
}
