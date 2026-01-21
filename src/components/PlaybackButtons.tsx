interface PlaybackButtonsProps {
  isPlaying: boolean;
  isLooping: boolean;
  onPlayPause: () => void;
  onRestart: () => void;
  onToggleLoop: () => void;
  disabled: boolean;
}

export function PlaybackButtons({
  isPlaying,
  isLooping,
  onPlayPause,
  onRestart,
  onToggleLoop,
  disabled,
}: PlaybackButtonsProps) {
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      <button
        onClick={onPlayPause}
        disabled={disabled}
        className="px-6 py-3 text-base font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>
      <button
        onClick={onRestart}
        disabled={disabled}
        className="px-6 py-3 text-base font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        ↻ Restart
      </button>
      <button
        onClick={onToggleLoop}
        className={`px-6 py-3 text-base font-semibold rounded-lg text-white transition-all hover:-translate-y-0.5 hover:shadow-lg ${
          isLooping
            ? 'bg-yellow-500 hover:bg-yellow-600 hover:shadow-yellow-500/30'
            : 'bg-gray-500 hover:bg-gray-600 hover:shadow-gray-500/30'
        }`}
      >
        ∞ Loop: {isLooping ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
