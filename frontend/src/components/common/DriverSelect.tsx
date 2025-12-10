import { getDriverColor } from '../../utils/helpers';

interface DriverSelectProps {
  drivers: string[];
  selectedDrivers: string[];
  onChange: (drivers: string[]) => void;
  maxSelection?: number;
  label?: string;
}

export default function DriverSelect({
  drivers,
  selectedDrivers,
  onChange,
  maxSelection = 4,
  label = 'Select Drivers',
}: DriverSelectProps) {
  const handleDriverClick = (driver: string) => {
    if (selectedDrivers.includes(driver)) {
      onChange(selectedDrivers.filter((d) => d !== driver));
    } else if (selectedDrivers.length < maxSelection) {
      onChange([...selectedDrivers, driver]);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-3">
          {label} ({selectedDrivers.length}/{maxSelection})
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {drivers.map((driver) => {
          const isSelected = selectedDrivers.includes(driver);
          const isDisabled = !isSelected && selectedDrivers.length >= maxSelection;
          const driverColor = getDriverColor(driver);
          
          return (
            <button
              key={driver}
              onClick={() => handleDriverClick(driver)}
              disabled={isDisabled}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isSelected
                  ? 'text-white shadow-lg'
                  : isDisabled
                    ? 'bg-f1-gray/30 text-gray-600 cursor-not-allowed'
                    : 'bg-f1-gray/50 text-gray-300 hover:bg-f1-gray'
                }
              `}
              style={isSelected ? {
                backgroundColor: driverColor,
                boxShadow: `0 4px 14px ${driverColor}40`,
              } : undefined}
            >
              {driver}
            </button>
          );
        })}
      </div>
    </div>
  );
}
