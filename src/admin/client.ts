for (const form of document.querySelectorAll<HTMLFormElement>(".archive-form"))
  form.addEventListener("submit", (event) => {
    if (
      !window.confirm("Archive this item? It will disappear from the website.")
    )
      event.preventDefault();
  });
for (const field of document.querySelectorAll<HTMLInputElement>(
  "input[data-image-upload]",
))
  field.addEventListener("change", async () => {
    const file = field.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    try {
      const image = await createImageBitmap(file);
      if (Math.max(image.width, image.height) <= 2000) {
        image.close();
        return;
      }
      const scale = 2000 / Math.max(image.width, image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas
        .getContext("2d")
        ?.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.88),
      );
      if (!blob) return;
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
          type: "image/webp",
        }),
      );
      field.files = transfer.files;
    } catch {
      /* The server validates the original file if client resizing is unavailable. */
    }
  });
