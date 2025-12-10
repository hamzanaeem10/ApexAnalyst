import { getTyreColor } from '../../utils/helpers';

interface TyreBadgeProps {
  compound: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export default function TyreBadge({ compound, showLabel = true, size = 'md' }: TyreBadgeProps) {
  const color = getTyreColor(compound);
  const compoundUpper = compound.toUpperCase();
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}50`,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {showLabel && <span>{compoundUpper}</span>}
    </span>
  );
}
