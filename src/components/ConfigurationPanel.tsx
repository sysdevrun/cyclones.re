interface ConfigurationPanelProps {
  speed: number;
  currentIndex: number;
  totalFrames: number;
  onSpeedChange: (speed: number) => void;
  onFrameChange: (index: number) => void;
  ir108Enabled: boolean;
  rgbEnabled: boolean;
  ir108Available: boolean;
  rgbAvailable: boolean;
  onIr108Toggle: (enabled: boolean) => void;
  onRgbToggle: (enabled: boolean) => void;
  disabled: boolean;
}

export function ConfigurationPanel({
  speed,
  currentIndex,
  totalFrames,
  onSpeedChange,
  onFrameChange,
  ir108Enabled,
  rgbEnabled,
  ir108Available,
  rgbAvailable,
  onIr108Toggle,
  onRgbToggle,
  disabled,
}: ConfigurationPanelProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-5">
      {/* Speed Control */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <label htmlFor="speedSlider" className="font-semibold text-gray-700 min-w-[120px]">
          Animation speed:
        </label>
        <input
          type="range"
          id="speedSlider"
          min="100"
          max="3000"
          step="100"
          value={speed}
          onChange={(e) => onSpeedChange(parseInt(e.target.value))}
          className="flex-1 min-w-[200px] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
        <span className="text-primary-500 font-semibold min-w-[60px] text-right">
          {speed} ms
        </span>
      </div>

      {/* Snapshot Slider */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <label htmlFor="snapshotSlider" className="font-semibold text-gray-700 min-w-[120px]">
          Snapshot:
        </label>
        <input
          type="range"
          id="snapshotSlider"
          min="0"
          max={Math.max(0, totalFrames - 1)}
          step="1"
          value={currentIndex}
          onChange={(e) => onFrameChange(parseInt(e.target.value))}
          disabled={disabled || totalFrames === 0}
          className="flex-1 min-w-[200px] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500 disabled:opacity-50"
        />
        <span className="text-primary-500 font-semibold min-w-[60px] text-right">
          {currentIndex + 1} / {totalFrames}
        </span>
      </div>

      {/* Satellite Layers */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="font-semibold text-gray-700 min-w-[120px]">
          Satellite layers:
        </label>
        <div className="flex gap-5 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ir108Enabled}
              onChange={(e) => onIr108Toggle(e.target.checked)}
              className="w-4 h-4 accent-primary-500 cursor-pointer"
            />
            <span className="text-gray-700">IR108 (Infrared)</span>
            <span className={`text-sm ${ir108Available ? 'text-green-600' : 'text-red-500'}`}>
              ({ir108Available ? 'available' : 'unavailable'})
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rgbEnabled}
              onChange={(e) => onRgbToggle(e.target.checked)}
              className="w-4 h-4 accent-primary-500 cursor-pointer"
            />
            <span className="text-gray-700">RGB Natural Enhanced</span>
            <span className={`text-sm ${rgbAvailable ? 'text-green-600' : 'text-red-500'}`}>
              ({rgbAvailable ? 'available' : 'unavailable'})
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
