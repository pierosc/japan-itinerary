const map = {
  restaurante: { label: "Restaurante", cls: "badge badge--rest" },
  tienda: { label: "Tienda", cls: "badge badge--shop" },
  supermercado: { label: "Super", cls: "badge badge--super" },
  bookoff: { label: "BookOff", cls: "badge badge--book" },
  atraccion: { label: "Atracción", cls: "badge badge--attr" },
  cafe: { label: "Café", cls: "badge badge--cafe" },
  hotel: { label: "Hotel", cls: "badge badge--hotel" },
  otro: { label: "Otro", cls: "badge badge--other" },
};

export default function CategoryBadge({ category = "otro" }) {
  const cfg = map[category] ?? map["otro"];
  return <span className={cfg.cls}>{cfg.label}</span>;
}
