const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 42;

const COLORS = {
  ink: [18, 25, 38],
  muted: [91, 103, 122],
  soft: [246, 248, 252],
  line: [220, 226, 235],
  blue: [37, 99, 235],
  blueDark: [16, 39, 92],
  red: [225, 78, 98],
  green: [18, 141, 97],
  amber: [205, 133, 32],
  lavender: [106, 92, 190],
};

const CATEGORY_LABELS = {
  restaurante: "Restaurante",
  tienda: "Tienda",
  supermercado: "Super",
  bookoff: "BookOff",
  atraccion: "Atraccion",
  cafe: "Cafe",
  hotel: "Hotel",
  otro: "Otro",
};

const MODE_LABELS = {
  walk: "A pie",
  train: "Tren",
  car: "Auto",
};

function clean(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function moneyJPY(value) {
  return `JPY ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)}`;
}

function convertedJPY(value, currency) {
  const amount = (Number(value) || 0) * (Number(currency?.ratePerJPY) || 0);
  return `${currency?.code || "USD"} ${amount.toFixed(2)}`;
}

function moneyPair(value, currency) {
  return `${moneyJPY(value)} / ${convertedJPY(value, currency)}`;
}

function dateLabel(value) {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function filename(value) {
  const base = clean(value || "itinerario-japon")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "itinerario"}-travel-book.pdf`;
}

function escapePdfString(value) {
  return clean(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function bytesFromBinaryString(value) {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i) & 255;
  }
  return bytes;
}

function binaryStringFromDataUrl(dataUrl) {
  const base64 = String(dataUrl).split(",")[1];
  if (!base64) return "";
  return atob(base64);
}

function firstImageUrl(place) {
  return (
    place?.images?.find((image) => image?.url)?.url ||
    place?.imageUrl ||
    place?.items?.find((item) => item?.imageUrl)?.imageUrl ||
    ""
  );
}

async function loadPdfImage(url, maxWidth = 900, maxHeight = 620) {
  const src = String(url || "").trim();
  if (!src || typeof Image === "undefined" || typeof document === "undefined") {
    return null;
  }

  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.src = src;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const scale = Math.min(
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight,
      1
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    return {
      width,
      height,
      data: binaryStringFromDataUrl(canvas.toDataURL("image/jpeg", 0.82)),
    };
  } catch {
    return null;
  }
}

async function preparePdfImages({ trip, places }) {
  const urls = [
    trip?.coverImage,
    ...places.map(firstImageUrl),
    ...places.flatMap((place) =>
      (place.items || []).map((item) => item?.imageUrl).filter(Boolean)
    ),
  ]
    .filter(Boolean)
    .slice(0, 36);

  const uniqueUrls = [...new Set(urls)];
  const loadedEntries = await Promise.all(
    uniqueUrls.map(async (url) => [url, await loadPdfImage(url)])
  );
  return new Map(loadedEntries.filter(([, image]) => image));
}

class PdfDoc {
  constructor() {
    this.pages = [];
    this.images = [];
    this.addPage();
  }

  addPage() {
    this.pages.push([]);
  }

  current() {
    return this.pages[this.pages.length - 1];
  }

  op(value) {
    this.current().push(value);
  }

  color(rgb) {
    this.op(`${rgb.map((v) => (v / 255).toFixed(3)).join(" ")} rg`);
  }

  strokeColor(rgb) {
    this.op(`${rgb.map((v) => (v / 255).toFixed(3)).join(" ")} RG`);
  }

  lineWidth(width) {
    this.op(`${width} w`);
  }

  font(size, bold = false) {
    this.op(`/${bold ? "F2" : "F1"} ${size} Tf`);
  }

  text(value, x, y, size = 10, color = COLORS.ink, bold = false) {
    if (!clean(value)) return;
    this.color(color);
    this.font(size, bold);
    this.op(`BT ${x.toFixed(2)} ${(PAGE.height - y).toFixed(2)} Td (${escapePdfString(value)}) Tj ET`);
  }

  rect(x, y, w, h, fill = COLORS.soft, stroke = null) {
    this.color(fill);
    if (stroke) {
      this.strokeColor(stroke);
      this.lineWidth(1);
      this.op(`${x.toFixed(2)} ${(PAGE.height - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`);
    } else {
      this.op(`${x.toFixed(2)} ${(PAGE.height - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    }
  }

  line(x1, y1, x2, y2, color = COLORS.line, width = 1) {
    this.strokeColor(color);
    this.lineWidth(width);
    this.op(`${x1.toFixed(2)} ${(PAGE.height - y1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE.height - y2).toFixed(2)} l S`);
  }

  addImage(image) {
    if (!image?.data) return null;
    const name = `Im${this.images.length + 1}`;
    this.images.push({ ...image, name });
    return name;
  }

  image(name, x, y, w, h) {
    if (!name) return;
    this.op(
      `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(PAGE.height - y - h).toFixed(2)} cm /${name} Do Q`
    );
  }

  build() {
    const objects = [];
    const addObject = (content) => {
      objects.push(content);
      return objects.length;
    };

    const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const imageRefs = this.images.map((image) => {
      const stream = image.data;
      const id = addObject(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytesFromBinaryString(stream).length} >>\nstream\n${stream}\nendstream`
      );
      return [image.name, id];
    });
    const xObjects = imageRefs.length
      ? `/XObject << ${imageRefs.map(([name, id]) => `/${name} ${id} 0 R`).join(" ")} >>`
      : "";
    const kids = [];

    this.pages.forEach((ops) => {
      const stream = ops.join("\n");
      const streamId = addObject(`<< /Length ${bytesFromBinaryString(stream).length} >>\nstream\n${stream}\nendstream`);
      const pageId = addObject(`<< /Type /Page /Parent PAGES_REF 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> ${xObjects} >> /Contents ${streamId} 0 R >>`);
      kids.push(pageId);
    });

    const pagesId = addObject(`<< /Type /Pages /Kids [${kids.map((id) => `${id} 0 R`).join(" ")}] /Count ${kids.length} >>`);
    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    const chunks = ["%PDF-1.4\n"];
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(bytesFromBinaryString(chunks.join("")).length);
      chunks.push(`${index + 1} 0 obj\n${object.replaceAll("PAGES_REF", String(pagesId))}\nendobj\n`);
    });

    const xrefOffset = bytesFromBinaryString(chunks.join("")).length;
    chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
    offsets.slice(1).forEach((offset) => {
      chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
    });
    chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    return new Blob(chunks.map(bytesFromBinaryString), {
      type: "application/pdf",
    });
  }
}

function estimateLines(text, width, size) {
  const maxChars = Math.max(12, Math.floor(width / (size * 0.52)));
  const words = clean(text).split(" ").filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function createLayout(doc) {
  let y = MARGIN;
  let pageNumber = 1;

  const footer = () => {
    doc.line(MARGIN, PAGE.height - 38, PAGE.width - MARGIN, PAGE.height - 38, COLORS.line);
    doc.text("Japan Travel Book", MARGIN, PAGE.height - 22, 8, COLORS.muted, true);
    doc.text(String(pageNumber), PAGE.width - MARGIN - 10, PAGE.height - 22, 8, COLORS.muted, true);
  };

  const newPage = () => {
    footer();
    doc.addPage();
    pageNumber += 1;
    y = MARGIN;
  };

  const need = (height) => {
    if (y + height > PAGE.height - 56) newPage();
  };

  const textBlock = (text, x, width, size = 10, color = COLORS.ink, bold = false, lineGap = 4) => {
    const lines = estimateLines(text, width, size);
    lines.forEach((line) => {
      doc.text(line, x, y, size, color, bold);
      y += size + lineGap;
    });
    return lines.length;
  };

  const sectionTitle = (title, kicker) => {
    need(54);
    y += 8;
    if (kicker) doc.text(kicker, MARGIN, y, 8, COLORS.blue, true);
    y += kicker ? 13 : 0;
    doc.text(title, MARGIN, y, 19, COLORS.ink, true);
    y += 18;
    doc.line(MARGIN, y, PAGE.width - MARGIN, y, COLORS.line);
    y += 18;
  };

  const chip = (label, x, yy, color = COLORS.blue) => {
    const width = Math.max(44, clean(label).length * 4.8 + 16);
    doc.rect(x, yy - 11, width, 17, [245, 248, 255], color);
    doc.text(label, x + 8, yy, 8, color, true);
    return width;
  };

  const statCard = (x, yy, w, label, value, accent = COLORS.blue) => {
    doc.rect(x, yy, w, 62, [255, 255, 255], COLORS.line);
    doc.rect(x, yy, 5, 62, accent);
    doc.text(label, x + 16, yy + 21, 8, COLORS.muted, true);
    doc.text(value, x + 16, yy + 43, 15, COLORS.ink, true);
  };

  return {
    get y() {
      return y;
    },
    set y(value) {
      y = value;
    },
    need,
    newPage,
    footer,
    sectionTitle,
    textBlock,
    chip,
    statCard,
  };
}

function dayTotal(day, places, routes, expenses) {
  const placeTotal = places
    .filter((place) => place.date === day)
    .reduce((total, place) => total + (Number(place.spendJPY) || 0), 0);
  const routeTotal = routes
    .filter((route) => route.date === day)
    .reduce((total, route) => total + (Number(route.priceJPY) || 0), 0);
  const expenseTotal = expenses
    .filter((expense) => expense.date === day)
    .reduce((total, expense) => total + (Number(expense.amountJPY) || 0), 0);
  return placeTotal + routeTotal + expenseTotal;
}

function tripTotal(places, routes, expenses) {
  return (
    places.reduce((total, place) => total + (Number(place.spendJPY) || 0), 0) +
    routes.reduce((total, route) => total + (Number(route.priceJPY) || 0), 0) +
    expenses.reduce((total, expense) => total + (Number(expense.amountJPY) || 0), 0)
  );
}

function placeItemsTotal(place) {
  return (place.items || []).reduce(
    (total, item) => total + (Number(item.qty) || 0) * (Number(item.priceJPY) || 0),
    0
  );
}

function groupedRoutes(routes) {
  const map = new Map();
  routes.forEach((route) => {
    map.set(`${route.date}:${route.fromId}:${route.toId}`, route);
  });
  return map;
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function generateTripPdf({
  trip,
  days = [],
  dayTitles = {},
  places = [],
  routes = [],
  expenses = [],
  packingItems = [],
  collaborators = [],
  currency = { code: "USD", ratePerJPY: 0.0065 },
}) {
  const doc = new PdfDoc();
  const loadedImages = await preparePdfImages({ trip, places });
  const imageNames = new Map(
    [...loadedImages.entries()].map(([url, image]) => [url, doc.addImage(image)])
  );
  const layout = createLayout(doc);
  const routeMap = groupedRoutes(routes);
  const sortedDays = [...days].sort();
  const assignedPlaces = places.filter((place) => place.date);
  const loosePlaces = places.filter((place) => !place.date);
  const total = tripTotal(places, routes, expenses);

  doc.rect(0, 0, PAGE.width, 235, COLORS.blueDark);
  doc.rect(0, 198, PAGE.width, 37, COLORS.blue);
  doc.rect(0, 235, PAGE.width, PAGE.height - 235, [250, 252, 255]);
  if (imageNames.get(trip?.coverImage)) {
    doc.image(imageNames.get(trip.coverImage), PAGE.width - 236, 36, 172, 132);
    doc.rect(PAGE.width - 236, 162, 172, 6, COLORS.blue);
  }
  doc.text("TRAVEL BOOK", MARGIN, 72, 10, [191, 219, 254], true);
  doc.text(trip?.title || "Viaje a Japon", MARGIN, 112, 34, [255, 255, 255], true);
  layout.y = 142;
  layout.textBlock(trip?.destination || "Japon", MARGIN, 360, 14, [226, 232, 240], false, 5);
  doc.text(`Creado ${dateLabel(new Date().toISOString().slice(0, 10))}`, MARGIN, 194, 10, [219, 234, 254], true);

  layout.statCard(MARGIN, 276, 118, "Dias", String(sortedDays.length), COLORS.blue);
  layout.statCard(MARGIN + 132, 276, 118, "Lugares", String(places.length), COLORS.red);
  layout.statCard(MARGIN + 264, 276, 118, "Budget", moneyJPY(total), COLORS.green);
  layout.statCard(MARGIN + 396, 276, 116, currency?.code || "USD", convertedJPY(total, currency), COLORS.amber);

  layout.y = 380;
  layout.sectionTitle("Resumen ejecutivo", "PLAN GENERAL");
  const summary = [
    `${assignedPlaces.length} lugares asignados en ${sortedDays.length} días.`,
    loosePlaces.length ? `${loosePlaces.length} ideas quedan en My Places para decidir luego.` : "No hay lugares pendientes sin fecha.",
    expenses.length ? `${expenses.length} gastos manuales registrados.` : "Aun no hay gastos manuales registrados.",
    packingItems.length ? `${packingItems.filter((item) => item.done).length}/${packingItems.length} items de packing list listos.` : "Packing list sin items.",
  ];
  summary.forEach((line) => {
    layout.need(28);
    doc.rect(MARGIN, layout.y - 4, PAGE.width - MARGIN * 2, 28, [255, 255, 255], COLORS.line);
    doc.text(line, MARGIN + 16, layout.y + 14, 10, COLORS.ink);
    layout.y += 38;
  });

  layout.sectionTitle("Itinerario por dia", "RUTA");
  sortedDays.forEach((day, dayIndex) => {
    const placesForDay = places.filter((place) => place.date === day);
    const totalForDay = dayTotal(day, places, routes, expenses);
    layout.need(96);
    doc.rect(MARGIN, layout.y, PAGE.width - MARGIN * 2, 58, [239, 246, 255], COLORS.line);
    doc.text(`Dia ${dayIndex + 1}`, MARGIN + 16, layout.y + 22, 9, COLORS.blue, true);
    doc.text(dayTitles[day] || dateLabel(day), MARGIN + 16, layout.y + 42, 16, COLORS.ink, true);
    doc.text(moneyPair(totalForDay, currency), PAGE.width - MARGIN - 155, layout.y + 34, 9, COLORS.muted, true);
    layout.y += 78;

    if (!placesForDay.length) {
      doc.text("Sin lugares asignados todavia.", MARGIN + 16, layout.y, 10, COLORS.muted);
      layout.y += 28;
      return;
    }

    placesForDay.forEach((place, placeIndex) => {
      const next = placesForDay[placeIndex + 1];
      const route = next ? routeMap.get(`${day}:${place.id}:${next.id}`) : null;
      const itemTotal = placeItemsTotal(place);
      const amount = itemTotal || Number(place.spendJPY) || 0;
      const notes = place.notes || place.sourceUrl || "";
      const placeImageName = imageNames.get(firstImageUrl(place));
      const textX = placeImageName ? MARGIN + 158 : MARGIN + 92;
      const noteLines = notes
        ? estimateLines(notes, placeImageName ? 296 : 365, 9).slice(0, 3)
        : [];
      const height = Math.max(
        72 + noteLines.length * 12 + ((place.items || []).length ? 18 : 0),
        placeImageName ? 76 : 0
      );
      layout.need(height + (route ? 34 : 12));

      doc.line(MARGIN + 13, layout.y - 4, MARGIN + 13, layout.y + height - 8, [191, 219, 254], 2);
      doc.rect(MARGIN + 4, layout.y + 4, 18, 18, COLORS.blue);
      doc.text(String(placeIndex + 1), MARGIN + 9, layout.y + 18, 9, [255, 255, 255], true);
      doc.text(place.startTime || "--:--", MARGIN + 34, layout.y + 15, 8, COLORS.blue, true);
      if (placeImageName) {
        doc.image(placeImageName, MARGIN + 92, layout.y + 2, 52, 52);
      }
      doc.text(place.name || "Lugar sin nombre", textX, layout.y + 16, 13, COLORS.ink, true);
      layout.chip(CATEGORY_LABELS[place.category] || "Otro", PAGE.width - MARGIN - 98, layout.y + 16, COLORS.lavender);
      doc.text(`Estancia ${place.durationMin ?? 60} min`, textX, layout.y + 34, 9, COLORS.muted);
      if (amount) doc.text(moneyPair(amount, currency), textX + 138, layout.y + 34, 9, COLORS.muted, true);
      if (noteLines.length) {
        let noteY = layout.y + 52;
        noteLines.forEach((line) => {
          doc.text(line, textX, noteY, 8, COLORS.muted);
          noteY += 11;
        });
      }
      if ((place.items || []).length) {
        doc.text(`${place.items.length} item(s) guardados en este lugar`, textX, layout.y + height - 16, 8, COLORS.green, true);
      }
      layout.y += height;

      if (route) {
        doc.rect(MARGIN + 34, layout.y - 6, PAGE.width - MARGIN * 2 - 34, 24, [248, 250, 252], COLORS.line);
        doc.text(`${MODE_LABELS[route.mode] || "Ruta"} hacia ${next.name || "siguiente punto"}`, MARGIN + 48, layout.y + 9, 8, COLORS.muted, true);
        const routeDetails = [route.name, route.durationMin ? `${route.durationMin} min` : "", route.priceJPY ? moneyJPY(route.priceJPY) : ""]
          .filter(Boolean)
          .join(" / ");
        if (routeDetails) doc.text(routeDetails, PAGE.width - MARGIN - 170, layout.y + 9, 8, COLORS.muted);
        layout.y += 36;
      }
    });
  });

  layout.sectionTitle("Gastos y compras", "BUDGET");
  const allPlaceItems = places.flatMap((place) =>
    (place.items || []).map((item) => ({ ...item, placeName: place.name, date: place.date }))
  );

  if (!expenses.length && !allPlaceItems.length) {
    doc.text("No hay gastos detallados todavia.", MARGIN, layout.y, 10, COLORS.muted);
    layout.y += 28;
  } else {
    [...expenses, ...allPlaceItems].slice(0, 80).forEach((entry) => {
      const isItem = Boolean(entry.placeName);
      const title = isItem ? `${entry.name || "Item"} - ${entry.placeName}` : entry.title || "Gasto";
      const amount = isItem
        ? (Number(entry.qty) || 0) * (Number(entry.priceJPY) || 0)
        : Number(entry.amountJPY) || 0;
      const itemImageName = imageNames.get(entry.imageUrl);
      const rowHeight = itemImageName ? 48 : 38;
      const textX = itemImageName ? MARGIN + 56 : MARGIN + 12;
      layout.need(rowHeight);
      doc.rect(MARGIN, layout.y - 6, PAGE.width - MARGIN * 2, rowHeight - 8, [255, 255, 255], COLORS.line);
      if (itemImageName) {
        doc.image(itemImageName, MARGIN + 10, layout.y - 2, 34, 34);
      }
      doc.text(title, textX, layout.y + 10, 9, COLORS.ink, true);
      doc.text(entry.paidBy || "Yo", MARGIN + 300, layout.y + 10, 8, COLORS.muted);
      doc.text(moneyPair(amount, currency), PAGE.width - MARGIN - 140, layout.y + 10, 8, COLORS.muted, true);
      layout.y += rowHeight;
    });
  }

  layout.sectionTitle("My Places", "IDEAS");
  if (!loosePlaces.length) {
    doc.text("No hay lugares sin fecha.", MARGIN, layout.y, 10, COLORS.muted);
    layout.y += 28;
  } else {
    loosePlaces.forEach((place) => {
      const placeImageName = imageNames.get(firstImageUrl(place));
      const rowHeight = placeImageName ? 58 : 44;
      const textX = placeImageName ? MARGIN + 58 : MARGIN;
      layout.need(rowHeight);
      if (placeImageName) {
        doc.image(placeImageName, MARGIN, layout.y - 8, 44, 44);
      }
      doc.text(place.name || "Lugar sin nombre", textX, layout.y, 11, COLORS.ink, true);
      doc.text(CATEGORY_LABELS[place.category] || "Otro", textX + 210, layout.y, 8, COLORS.lavender, true);
      if (place.notes) doc.text(clean(place.notes).slice(0, 86), textX, layout.y + 15, 8, COLORS.muted);
      layout.y += rowHeight;
    });
  }

  layout.sectionTitle("Packing list", "CHECKLIST");
  if (!packingItems.length) {
    doc.text("Packing list sin items.", MARGIN, layout.y, 10, COLORS.muted);
    layout.y += 28;
  } else {
    packingItems.forEach((item) => {
      layout.need(26);
      doc.rect(MARGIN, layout.y - 10, 12, 12, [255, 255, 255], item.done ? COLORS.green : COLORS.line);
      if (item.done) doc.text("x", MARGIN + 3, layout.y, 9, COLORS.green, true);
      doc.text(item.label || "Item", MARGIN + 24, layout.y, 10, item.done ? COLORS.muted : COLORS.ink, item.done);
      layout.y += 24;
    });
  }

  if (collaborators.length) {
    layout.sectionTitle("Viajeros", "EQUIPO");
    collaborators.forEach((person) => {
      layout.need(24);
      doc.text(person.nameOrEmail || "Invitado", MARGIN, layout.y, 10, COLORS.ink);
      layout.y += 22;
    });
  }

  layout.footer();
  saveBlob(doc.build(), filename(trip?.title || "japan-trip"));
}
