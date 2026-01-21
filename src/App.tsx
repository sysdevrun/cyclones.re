import { useState, useCallback } from 'react';
import { useCycloneData } from './hooks/useCycloneData';
import { useAnimation } from './hooks/useAnimation';
import { CycloneMap } from './components/CycloneMap';
import { PlaybackButtons } from './components/PlaybackButtons';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { ReportSection } from './components/ReportSection';
import { LoadingOverlay } from './components/LoadingOverlay';

function App() {
  const {
    metadata,
    currentSnapshot,
    currentMetadata,
    isLoading,
    loadingMessage,
    error,
    loadSnapshot,
  } = useCycloneData();

  const [ir108Enabled, setIr108Enabled] = useState(false);
  const [rgbEnabled, setRgbEnabled] = useState(false);
  const [hasInitiallyFitted, setHasInitiallyFitted] = useState(false);

  const handleFrameChange = useCallback((index: number) => {
    loadSnapshot(index);
  }, [loadSnapshot]);

  const animation = useAnimation({
    totalFrames: metadata.length,
    onFrameChange: handleFrameChange,
  });

  const handleInitialFitDone = useCallback(() => {
    setHasInitiallyFitted(true);
  }, []);

  // Get cyclone names for display
  const cycloneNames = currentSnapshot?.trajectories
    .map((t) => t.cyclone_trajectory.cyclone_name)
    .join(', ') || '';

  return (
    <div className="min-h-screen bg-gradient-primary flex justify-center items-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-5xl w-full">
        {/* Header */}
        <h1 className="text-center text-gray-800 text-3xl font-bold mb-4">
          <span className="mr-2">🌀</span>
          Cyclone Trajectory Map
        </h1>

        {/* Data source */}
        <div className="text-center mb-4 text-gray-600">
          Données{' '}
          <a
            href="https://meteofrance.re/fr/cyclone"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:underline font-medium"
          >
            Météo-France
          </a>
          {' '}- conçu par{' '}
          <a
            href="https://www.sys-dev-run.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:underline font-medium"
          >
            SysDevRun
          </a>
        </div>

        {/* Map Container */}
        <div className="relative">
          {currentSnapshot && currentSnapshot.trajectories.length > 0 ? (
            <CycloneMap
              trajectories={currentSnapshot.trajectories.map((t) => t.cyclone_trajectory)}
              ir108Data={currentMetadata?.satellite_ir108 || null}
              rgbData={currentMetadata?.satellite_rgb_naturalenhncd || null}
              ir108Enabled={ir108Enabled}
              rgbEnabled={rgbEnabled}
              initialFit={!hasInitiallyFitted}
              onInitialFitDone={handleInitialFitDone}
            />
          ) : (
            <div className="h-[500px] rounded-xl bg-gray-100 flex items-center justify-center">
              <div className="text-gray-500">No active cyclones</div>
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <LoadingOverlay message={loadingMessage} error={error} />
          )}
        </div>

        {/* Cyclone names and date below map */}
        <div className="text-center my-4">
          {cycloneNames && (
            <div className="text-xl font-semibold text-gray-800">
              {cycloneNames}
            </div>
          )}
          <div className="text-lg text-gray-600">
            {currentSnapshot?.date || 'Loading...'}
          </div>
        </div>

        {/* Playback Buttons */}
        <div className="mb-4">
          <PlaybackButtons
            isPlaying={animation.isPlaying}
            isLooping={animation.isLooping}
            onPlayPause={animation.togglePlayPause}
            onRestart={animation.restart}
            onToggleLoop={animation.toggleLoop}
            disabled={isLoading || !!error}
          />
        </div>

        {/* Configuration Panel */}
        <div className="mb-4">
          <ConfigurationPanel
            speed={animation.speed}
            currentIndex={animation.currentIndex}
            totalFrames={metadata.length}
            onSpeedChange={animation.updateSpeed}
            onFrameChange={animation.goToFrame}
            ir108Enabled={ir108Enabled}
            rgbEnabled={rgbEnabled}
            ir108Available={!!currentMetadata?.satellite_ir108}
            rgbAvailable={!!currentMetadata?.satellite_rgb_naturalenhncd}
            onIr108Toggle={setIr108Enabled}
            onRgbToggle={setRgbEnabled}
            disabled={isLoading || !!error}
          />
        </div>

        {/* Report Section */}
        {currentSnapshot?.report && (
          <ReportSection report={currentSnapshot.report} />
        )}
      </div>
    </div>
  );
}

export default App;
