import { Brick as BrickT, CATEGORY_COLOR, Category } from "@/lib/types";
import { brickPct } from "@/lib/dharma";

interface Props {
  brick: BrickT;
  category: Category;
  index: number;
}

export function Brick({ brick, category, index }: Props) {
  const pct = brickPct(brick);
  const color = CATEGORY_COLOR[category];
  const empty = pct === 0;
  const partial = pct > 0 && pct < 100;
  const cls = [
    "brick brick-in",
    empty && "brick--empty",
    partial && "brick--partial",
  ]
    .filter(Boolean)
    .join(" ");

  let label = "";
  if (brick.kind === "tick") {
    label = brick.name;
  } else if (brick.kind === "time") {
    label = `${brick.name} ${brick.current}/${brick.target}m`;
  } else {
    label = `${brick.name} ${brick.current}/${brick.target}`;
  }

  return (
    <span
      className={cls}
      style={
        {
          "--brick-color": color,
          animationDelay: `${index * 35}ms`,
        } as React.CSSProperties
      }
    >
      {label}
    </span>
  );
}
