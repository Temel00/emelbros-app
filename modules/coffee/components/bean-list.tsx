import { BeanCard } from "@/modules/coffee/components/bean-card";
import type { CoffeeBeanRow } from "@/modules/coffee/queries";

export function BeanList({ beans }: { beans: CoffeeBeanRow[] }) {
  if (beans.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No beans yet.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {beans.map((bean) => (
        <li key={bean.id}>
          <BeanCard bean={bean} />
        </li>
      ))}
    </ul>
  );
}
