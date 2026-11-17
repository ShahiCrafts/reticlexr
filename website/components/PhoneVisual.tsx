/**
 * Decorative hero artwork: a flat vector room scene inside a CSS phone
 * frame, with orbit ellipses, a flat cube and a sphere around it.
 * Pure CSS + inline SVG — no image, no gradient, no shadow. It is an
 * illustration, not a screenshot of the demo.
 */
export function PhoneVisual() {
  return (
    <div className="relative mx-auto w-full" aria-hidden="true">
      {/* Orbit ellipses */}
      <svg
        className="absolute left-1/2 top-1/2 -z-0 h-[112%] w-[135%] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 400 640"
        fill="none"
      >
        <ellipse cx="200" cy="320" rx="192" ry="118" transform="rotate(-16 200 320)" stroke="#bfdbfe" strokeWidth="1.5" />
        <ellipse cx="200" cy="320" rx="196" ry="128" transform="rotate(11 200 320)" stroke="#dbeafe" strokeWidth="1.5" />
      </svg>

      {/* Flat sphere */}
      <div className="absolute -left-7 top-[47%] z-10 h-11 w-11 rounded-full bg-[#3b82f6] sm:-left-10" />

      {/* Flat cube */}
      <svg className="absolute -right-4 top-4 z-10 w-16 sm:-right-8 sm:w-[4.5rem]" viewBox="0 0 64 64" fill="none">
        <polygon points="32,3 59,17.5 32,32 5,17.5" fill="#93c5fd" />
        <polygon points="5,17.5 32,32 32,61 5,46.5" fill="#2563eb" />
        <polygon points="32,32 59,17.5 59,46.5 32,61" fill="#3b82f6" />
      </svg>

      {/* Phone */}
      <div className="relative rounded-[3rem] bg-slate-900 p-[10px]">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white">
          {/* Notch */}
          <div className="absolute left-1/2 top-2.5 z-20 h-[22px] w-24 -translate-x-1/2 rounded-full bg-slate-900" />

          {/* Flat room scene */}
          <svg viewBox="0 0 300 600" className="block h-auto w-full" role="img">
            {/* Wall */}
            <rect x="0" y="0" width="300" height="382" fill="#eff6ff" />
            {/* Picture frame */}
            <rect x="182" y="64" width="86" height="108" rx="6" fill="#ffffff" stroke="#bfdbfe" strokeWidth="2" />
            <circle cx="238" cy="94" r="10" fill="#93c5fd" />
            <polygon points="192,162 222,116 244,146 256,130 258,162" fill="#bfdbfe" />
            {/* Wall lamp */}
            <rect x="34" y="92" width="4" height="66" fill="#93c5fd" />
            <polygon points="22,92 50,92 42,66 30,66" fill="#2563eb" />
            {/* Baseboard */}
            <rect x="0" y="374" width="300" height="8" fill="#ffffff" />
            {/* Floor */}
            <rect x="0" y="382" width="300" height="218" fill="#dbeafe" />
            <path d="M0 452h300M0 522h300" stroke="#bfdbfe" strokeWidth="2" />
            {/* Rug */}
            <ellipse cx="188" cy="516" rx="106" ry="27" fill="#eff6ff" />
            {/* Plant */}
            <g>
              <ellipse cx="52" cy="252" rx="11" ry="34" fill="#22c55e" transform="rotate(-24 52 252)" />
              <ellipse cx="76" cy="238" rx="11" ry="38" fill="#16a34a" transform="rotate(6 76 238)" />
              <ellipse cx="98" cy="254" rx="10" ry="30" fill="#4ade80" transform="rotate(26 98 254)" />
              <polygon points="44,318 104,318 96,376 52,376" fill="#2563eb" />
              <rect x="40" y="308" width="68" height="12" rx="4" fill="#1d4ed8" />
            </g>
            {/* Armchair */}
            <g>
              <rect x="134" y="296" width="118" height="114" rx="24" fill="#2563eb" />
              <rect x="151" y="314" width="84" height="80" rx="16" fill="#3b82f6" />
              <rect x="118" y="350" width="31" height="88" rx="15" fill="#1d4ed8" />
              <rect x="237" y="350" width="31" height="88" rx="15" fill="#1d4ed8" />
              <rect x="141" y="390" width="104" height="36" rx="15" fill="#3b82f6" />
              <rect x="146" y="432" width="94" height="13" rx="6" fill="#1e40af" />
              <rect x="156" y="445" width="9" height="18" fill="#0f172a" />
              <rect x="221" y="445" width="9" height="18" fill="#0f172a" />
            </g>
            {/* Placement ring */}
            <ellipse cx="193" cy="514" rx="72" ry="18" fill="none" stroke="#ffffff" strokeWidth="5" />
            <ellipse cx="193" cy="514" rx="38" ry="9" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.75" />
          </svg>

          {/* Tooltip chip */}
          <div className="absolute right-4 top-[36%] z-20 flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
              <path d="M5 3l14 7-6.6 1.6L9 18z" />
            </svg>
            Tap to place
          </div>
        </div>
      </div>
    </div>
  );
}
