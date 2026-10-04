import type { KeyboardEvent } from "react";

export function handleTabKeyDown<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  tabs: readonly T[],
  onChange: (tab: T) => void,
) {
  let nextIndex: number;
  switch (event.key) {
    case "ArrowRight":
      nextIndex = (index + 1) % tabs.length;
      break;
    case "ArrowLeft":
      nextIndex = (index - 1 + tabs.length) % tabs.length;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = tabs.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']");
  buttons?.[nextIndex]?.focus();
  onChange(tabs[nextIndex]);
}
