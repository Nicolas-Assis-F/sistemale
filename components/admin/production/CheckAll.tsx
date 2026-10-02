'use client';

/** Marca/desmarca de uma vez as hastes de um mesmo lote (mesma marca gravada). */
export function CheckAll({ group, count }: { group: string; count: number }) {
  function toggle() {
    const boxes = [...document.querySelectorAll<HTMLInputElement>(`input[data-group="${group}"]`)];
    const check = boxes.some((b) => !b.checked);
    boxes.forEach((b) => { b.checked = check; });
  }
  return (
    <button type="button" onClick={toggle} className="rounded-lg border border-le-line px-2.5 py-1.5 text-xs font-medium text-le-blue hover:bg-le-tint">
      Marcar/desmarcar as {count}
    </button>
  );
}
