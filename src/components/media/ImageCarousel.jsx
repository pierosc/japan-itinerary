// src/components/media/ImageCarousel.jsx
import { useEffect, useState } from "react";

export default function ImageCarousel({ images = [], height = 320 }) {
  const [idx, setIdx] = useState(0);
  const has = images.length > 0;

  useEffect(() => {
    const onKey = (e) => {
      if (!has) return;
      if (e.key === "ArrowRight")
        setIdx((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [has, images.length]);

  if (!has) {
    return (
      <div
        className="card"
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Sin imágenes
      </div>
    );
  }

  const go = (n) =>
    setIdx((i) => Math.max(0, Math.min(images.length - 1, i + n)));
  const img = images[idx];

  return (
    <div
      className="card"
      style={{
        position: "relative",
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={img.src}
        alt={img.alt || `img-${idx + 1}`}
        style={{
          maxHeight: height - 12,
          maxWidth: "100%",
          borderRadius: 12,
          objectFit: "contain",
        }}
      />
      <button
        className="btn-outline"
        style={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
        }}
        onClick={() => go(-1)}
        disabled={idx === 0}
      >
        ◀
      </button>
      <button
        className="btn-outline"
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
        }}
        onClick={() => go(1)}
        disabled={idx === images.length - 1}
      >
        ▶
      </button>
      <div
        className="text-xs"
        style={{ position: "absolute", bottom: 8, right: 12, opacity: 0.8 }}
      >
        {idx + 1}/{images.length}
      </div>
    </div>
  );
}
