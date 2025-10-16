export default function MenuImageModal({ url, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full p-3">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Menú</h4>
          <button className="text-sm text-gray-600" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <img src={url} alt="Menú" className="w-full h-auto rounded" />
        </div>
        <div className="mt-2 text-xs">
          <a
            className="text-blue-600 underline"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            Abrir en nueva pestaña
          </a>
        </div>
      </div>
    </div>
  );
}
