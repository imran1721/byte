// The byte app icon (squircle + pixel mark), inline so it's crisp at any size
// and needs no cropped asset. Coordinates match public/byte-logo.png.
const TILE = 75;
const SQUARES = [
  [171, 80], [171, 171], [171, 263], [171, 354], [171, 446],
  [263, 263], [354, 263], [354, 354], [263, 446], [354, 446],
];

export default function ByteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 600"
      role="img"
      aria-label="byte"
    >
      <defs>
        <linearGradient
          id="byte-icon-grad"
          x1="0"
          y1="0"
          x2="600"
          y2="600"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#2bc9a0" />
          <stop offset="1" stopColor="#86cf22" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" rx="140" fill="url(#byte-icon-grad)" />
      {SQUARES.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={TILE}
          height={TILE}
          rx="15"
          fill="#fff"
        />
      ))}
    </svg>
  );
}
