import brandIcon from '../media/brand_icon_transparent.png';

/**
 * Editorial CastReach Logo with Main Brand Icon
 */
export default function CastReachLogo({ size = 44, textSize = 23, color = '#FFFFFF', showIcon = true }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, userSelect: 'none' }}>
      {showIcon && (
        <img
          src={brandIcon}
          alt="CastReach Logo"
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            display: 'block',
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
          }}
        />
      )}
      <span
        style={{
          fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontWeight: 850,
          fontSize: textSize,
          letterSpacing: '-0.02em',
          color: color,
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        CASTREACH
      </span>
    </div>
  );
}

