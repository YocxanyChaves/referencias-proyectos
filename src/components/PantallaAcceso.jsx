import escudoNavy from '../assets/icap-escudo-navy.png'
import logoIcap from '../assets/icap-logo-mark.png'
import FondoHero from './FondoHero'

// Marco de las pantallas sin sesión (iniciar sesión, crear contraseña):
// fondo del hero del brochure y una tarjeta al estilo de las fichas de Autoridades.
export default function PantallaAcceso({ titulo = 'Referencias de Proyectos', subtitulo, children }) {
  return (
    <div className="acceso fondo-hero">
      <FondoHero />
      <div className="acceso-contenido">
        <div className="tarjeta-acceso">
          <img src={escudoNavy} alt="" aria-hidden="true" className="tarjeta-marca-agua" draggable={false} />

          <span className="kicker">ICAP · Sistema interno</span>

          <div className="emblema">
            <span className="emblema-halo" aria-hidden="true" />
            <span className="emblema-anillo" aria-hidden="true" />
            <span className="emblema-logo">
              <img src={logoIcap} alt="Isotipo ICAP" draggable={false} />
            </span>
          </div>

          <h1>{titulo}</h1>
          {subtitulo && <p className="acceso-subtitulo">{subtitulo}</p>}

          <div className="acceso-cuerpo">{children}</div>
        </div>
        <p className="acceso-pie">Instituto Centroamericano de Administración Pública</p>
      </div>
    </div>
  )
}
