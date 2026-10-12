export function folio(id: number) {
  return `#${String(id).padStart(6, '0')}`;
}

export function waLink(telefono: string, mensaje: string) {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}
