interface LoadingOverlayProps {
  message: string;
  progress?: number; // 0-100
  error?: string | null;
}

export function LoadingOverlay({ message, progress, error }: LoadingOverlayProps) {
  const showProgress = progress !== undefined && progress > 0 && !error;

  return (
    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-[1000] rounded-lg">
      {!error && (
        <div className="w-12 h-12 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin mb-4" />
      )}
      <div className={`text-lg font-medium ${error ? 'text-red-500' : 'text-primary-500'}`}>
        {error || message}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-64 mt-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center text-sm text-gray-500 mt-1">
            {progress}%
          </div>
        </div>
      )}
    </div>
  );
}
