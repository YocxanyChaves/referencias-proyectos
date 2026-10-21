import {
  Building2,
  Bus,
  Cpu,
  Handshake,
  HeartPulse,
  Landmark,
  Leaf,
  Scale,
  Store,
  Tag,
  TrendingUp,
  Users,
  Wheat,
  Workflow,
  Zap,
} from 'lucide-react'

// Ícono de cada etiqueta según palabras de su nombre. Las etiquetas las edita un admin,
// así que no se amarran a un id: una etiqueta nueva sin coincidencia lleva el ícono genérico.
const REGLAS = [
  [/aliment|nutric/, Wheat],
  [/ambiente|clima/, Leaf],
  [/cooperaci/, Handshake],
  [/derecho/, Scale],
  [/econom|comercio/, TrendingUp],
  [/energ/, Zap],
  [/genero|equidad/, Users],
  [/infraestructura/, Building2],
  [/pyme|emprend/, Store],
  [/politica|gobern/, Landmark],
  [/salud/, HeartPulse],
  [/tecnolog|digital/, Cpu],
  [/organizaci|institucional/, Workflow],
  [/transporte|movilidad/, Bus],
]

export function iconoEtiqueta(nombre = '') {
  const texto = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return REGLAS.find(([regla]) => regla.test(texto))?.[1] ?? Tag
}
