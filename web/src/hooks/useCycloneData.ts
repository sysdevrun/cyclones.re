import { useState, useEffect, useCallback } from 'react';
import type { SnapshotMetadata, LoadedSnapshot } from '../types';
import { loadMetadata, fetchSnapshotData, getSatelliteImageUrl } from '../utils/api';
import { preloadImage } from '../utils/imagePreloader';

interface UseCycloneDataResult {
  metadata: SnapshotMetadata[];
  currentSnapshot: LoadedSnapshot | null;
  currentMetadata: SnapshotMetadata | null;
  isLoading: boolean;
  loadingMessage: string;
  loadingProgress: number; // 0-100
  error: string | null;
  loadSnapshot: (index: number) => Promise<void>;
}

export function useCycloneData(): UseCycloneDataResult {
  const [metadata, setMetadata] = useState<SnapshotMetadata[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<LoadedSnapshot | null>(null);
  const [currentMetadata, setCurrentMetadata] = useState<SnapshotMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Chargement des métadonnées...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load and prefetch all data
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Step 1: Load metadata
        setLoadingMessage('Chargement des métadonnées...');
        setLoadingProgress(0);
        const data = await loadMetadata();

        if (!mounted) return;
        setMetadata(data);

        if (data.length === 0) {
          setIsLoading(false);
          return;
        }

        // Step 2: Prefetch all snapshots and images
        setLoadingMessage('Préchargement des données...');

        const total = data.length;
        let completed = 0;

        // Process all snapshots in parallel with progress tracking
        await Promise.all(
          data.map(async (meta) => {
            // Fetch snapshot data (JSON)
            await fetchSnapshotData(meta);

            // Preload satellite images
            const imagePromises: Promise<void>[] = [];
            if (meta.satellite_ir108?.file) {
              imagePromises.push(
                preloadImage(getSatelliteImageUrl(meta.satellite_ir108.file))
              );
            }
            if (meta.satellite_rgb_naturalenhncd?.file) {
              imagePromises.push(
                preloadImage(getSatelliteImageUrl(meta.satellite_rgb_naturalenhncd.file))
              );
            }
            await Promise.all(imagePromises);

            // Update progress
            completed++;
            if (mounted) {
              const progress = Math.round((completed / total) * 100);
              setLoadingProgress(progress);
              setLoadingMessage(`Préchargement des données... ${completed}/${total}`);
            }
          })
        );

        if (!mounted) return;

        // Step 3: Set first snapshot as current
        setLoadingMessage('Prêt !');
        setLoadingProgress(100);

        const firstSnapshot = await fetchSnapshotData(data[0]);
        if (!mounted) return;

        setCurrentSnapshot(firstSnapshot);
        setCurrentMetadata(data[0]);
        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setIsLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const loadSnapshot = useCallback(async (index: number) => {
    if (index < 0 || index >= metadata.length) return;

    const meta = metadata[index];
    setCurrentMetadata(meta);

    try {
      // Data is already cached, this will return immediately
      const snapshot = await fetchSnapshotData(meta);
      setCurrentSnapshot(snapshot);
    } catch (err) {
      console.error('Error loading snapshot:', err);
    }
  }, [metadata]);

  return {
    metadata,
    currentSnapshot,
    currentMetadata,
    isLoading,
    loadingMessage,
    loadingProgress,
    error,
    loadSnapshot,
  };
}
