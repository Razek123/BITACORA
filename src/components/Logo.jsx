/** Isotipo de Bitácora: libro abierto, página LGHT (azul) y página Nuvixa (terracota). */
function LogoHalf({ color }) {
  return (
    <g>
      <path fill={color} d="M0 5.4H5.4V59.5H40.2C43.8 59.5 46.6 61.6 47.6 64.6H0Z" />
      <path fill={color} d="M8.1 0H40.7C45.1 0 48.7 3.6 48.7 8V60.7C46.9 58.1 44 56.4 40.7 56.4H8.1Z" />
      <g fill="#FFFFFF">
        <rect x="15" y="10.5" width="17.4" height="2.5" />
        <rect x="15" y="18.6" width="27" height="2.5" />
        <rect x="15" y="26.6" width="27" height="2.5" />
        <rect x="15" y="34.8" width="27" height="2.5" />
        <rect x="15" y="42.9" width="17.4" height="2.5" />
      </g>
    </g>
  );
}

export function LogoMark({ className = 'h-7 w-auto' }) {
  return (
    <svg viewBox="0 0 100 65" className={className} role="img" aria-label="Bitácora">
      <LogoHalf color="#1D4ED8" />
      <g transform="translate(100 0) scale(-1 1)">
        <LogoHalf color="#C2410C" />
      </g>
    </svg>
  );
}
