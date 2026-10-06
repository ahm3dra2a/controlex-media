// Native links, details and forms work without this enhancement.
for (const menu of document.querySelectorAll<HTMLDetailsElement>(
  ".mobile-menu",
)) {
  menu.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a"))
      menu.open = false;
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }
  });
}
