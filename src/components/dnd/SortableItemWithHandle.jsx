// src/components/dnd/SortableItemWithHandle.jsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Uso:
 * <SortableItemWithHandle id={p.id}>
 *   {({ setNodeRef, style, handleProps }) => (
 *     <li ref={setNodeRef} style={style}>
 *       <div> ...contenido... <button {...handleProps}>⋮⋮</button></div>
 *     </li>
 *   )}
 * </SortableItemWithHandle>
 */
export default function SortableItemWithHandle({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
  };
  const handleProps = {
    ...attributes,
    ...listeners,
    style: { cursor: "grab" },
    title: "Arrastrar",
  };
  return children({ setNodeRef, style, handleProps });
}
