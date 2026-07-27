/**
 * Decorative login hero: a floating hairstyle silhouette in salon pinks.
 *
 * Everything moves via `transform` only and every element's base opacity is
 * its visible value, so if animations are throttled or disabled the mark
 * still renders correctly — just still. Purely ornamental, hidden from AT.
 */
export function HairstyleMark() {
  return (
    <div className="hero-mark" aria-hidden="true">
      <svg viewBox="0 0 240 250" role="presentation" focusable="false">
        <defs>
          <linearGradient id="esb-hair" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent-2))" />
            <stop offset="55%" stopColor="rgb(var(--accent))" />
            <stop offset="100%" stopColor="rgb(var(--accent-2))" />
          </linearGradient>

          <radialGradient id="esb-halo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgb(var(--accent-2) / 0.5)" />
            <stop offset="65%" stopColor="rgb(var(--accent-2) / 0.14)" />
            <stop offset="100%" stopColor="rgb(var(--accent-2) / 0)" />
          </radialGradient>
        </defs>

        {/* Soft breathing halo */}
        <circle className="hero-halo" cx="120" cy="118" r="104" fill="url(#esb-halo)" />

        <g className="hero-float">
          {/* Hair silhouette with wavy tips */}
          <path
            className="hero-hair"
            fill="url(#esb-hair)"
            d="M120 30
               C78 30 52 60 52 104
               C52 134 56 154 46 186
               C66 180 80 166 89 151
               C91 170 93 185 88 203
               C103 194 113 179 119 162
               C126 179 136 194 151 203
               C146 185 148 170 150 151
               C160 166 173 180 194 186
               C183 154 187 134 187 104
               C187 60 162 30 120 30 Z"
          />

          {/* Face opening — what makes the shape read as a hairstyle */}
          <ellipse cx="120" cy="107" rx="30" ry="36" fill="rgb(var(--surface))" opacity="0.95" />

          {/* Fringe sweeping across the brow */}
          <path
            fill="url(#esb-hair)"
            d="M90 100
               C92 68 106 52 121 52
               C138 52 152 68 151 100
               C144 80 130 71 116 76
               C104 80 95 88 90 100 Z"
          />

          {/* Loose strands, each swaying on its own cycle so the motion
              never visibly repeats in lockstep */}
          <path
            className="hero-strand hero-strand--a"
            fill="none"
            stroke="rgb(var(--accent-2))"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.75"
            d="M70 96 C60 126 64 152 56 176"
          />
          <path
            className="hero-strand hero-strand--b"
            fill="none"
            stroke="rgb(var(--accent-2))"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.75"
            d="M170 96 C180 126 176 152 184 176"
          />

          {/* Shine highlight */}
          <path
            fill="none"
            stroke="rgb(255 255 255 / 0.4)"
            strokeWidth="4"
            strokeLinecap="round"
            d="M95 58 C82 70 76 84 75 100"
          />
        </g>

        {/* Twinkles */}
        <g fill="rgb(var(--accent))">
          <path className="hero-sparkle hero-sparkle--1" d="M40 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
          <path className="hero-sparkle hero-sparkle--2" d="M200 56 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z" />
          <path className="hero-sparkle hero-sparkle--3" d="M206 140 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
        </g>
      </svg>
    </div>
  );
}
