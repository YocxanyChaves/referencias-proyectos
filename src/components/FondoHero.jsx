// Capas animadas del fondo del hero del brochure ICAP: resplandor, tres ondas y partículas.
// Va dentro de un contenedor con la clase `fondo-hero`, que pone el degradado institucional.

// Posiciones y tiempos fijos para que la animación sea estable entre renders.
const PARTICULAS = [
  { left: '8%', size: 6, duracion: '9s', retraso: '-1s' },
  { left: '22%', size: 4, duracion: '12s', retraso: '-4.5s' },
  { left: '38%', size: 5, duracion: '10.5s', retraso: '-7s' },
  { left: '58%', size: 7, duracion: '13s', retraso: '-2.5s' },
  { left: '74%', size: 4, duracion: '9.5s', retraso: '-8s' },
  { left: '88%', size: 6, duracion: '11.5s', retraso: '-3.5s' },
]

// Cada svg mide 200% de ancho con el trazo repetido cada 800 unidades,
// así que trasladarlo -50% cierra el ciclo sin costura.
const ONDAS = [
  { d: 'M0 130 C 200 55, 600 205, 800 130 C 1000 55, 1400 205, 1600 130', ancho: 1.8, opacidad: 0.24, rapida: true },
  { d: 'M0 480 C 220 545, 580 415, 800 480 C 1020 545, 1380 415, 1600 480', ancho: 1.6, opacidad: 0.18, rapida: true },
  { d: 'M0 300 C 250 260, 550 340, 800 300 C 1050 260, 1350 340, 1600 300', ancho: 1.2, opacidad: 0.09, rapida: false },
]

export default function FondoHero() {
  return (
    <div className="hero-capas" aria-hidden="true">
      <div className="hero-resplandor" />
      {ONDAS.map((o, i) => (
        <div key={i} className={o.rapida ? 'hero-onda vaiven-rapido' : 'hero-onda vaiven-lento'}>
          <svg className={o.rapida ? 'deriva-rapida' : 'deriva-lenta'} viewBox="0 0 1600 600" preserveAspectRatio="none">
            <path d={o.d} strokeWidth={o.ancho} style={{ opacity: o.opacidad }} />
          </svg>
        </div>
      ))}
      {PARTICULAS.map((p, i) => (
        <span
          key={i}
          className="hero-particula"
          style={{ left: p.left, width: p.size, height: p.size, animationDuration: p.duracion, animationDelay: p.retraso }}
        />
      ))}
    </div>
  )
}
