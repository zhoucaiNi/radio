export default function Scene() {
  return (
    <svg className="scene" aria-hidden="true" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMax slice">
      <g className="stars">
        <circle cx="120" cy="90" r="1.6" />
        <circle cx="260" cy="170" r="1.2" />
        <circle cx="390" cy="60" r="1.8" />
        <circle cx="470" cy="240" r="1.1" />
        <circle cx="820" cy="80" r="1.5" />
        <circle cx="940" cy="190" r="1.2" />
        <circle cx="1050" cy="300" r="1.9" />
        <circle cx="60" cy="280" r="1.1" />
        <circle cx="720" cy="40" r="1.1" />
        <circle cx="560" cy="130" r="1.3" />
      </g>
      <circle className="sun-glow" cx="1130" cy="140" r="90" />
      <circle className="sun" cx="1130" cy="140" r="56" />
      <path className="hill hill-far" d="M0 560 C 200 480 420 500 620 560 C 820 620 1040 490 1280 540 L1280 800 L0 800 Z" />
      <path className="hill hill-mid" d="M0 640 C 240 580 460 620 660 660 C 860 700 1060 610 1280 630 L1280 800 L0 800 Z" />
      <path className="hill hill-near" d="M0 720 C 300 690 600 710 900 730 C 1060 740 1180 720 1280 715 L1280 800 L0 800 Z" />
    </svg>
  )
}
