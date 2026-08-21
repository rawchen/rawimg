import { useState, useEffect } from "react";
import { Fancybox } from "@fancyapps/ui";
import type { FancyboxOptions } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

export default function useFancybox(options: Partial<FancyboxOptions> = {}) {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (root) {
      const fancyboxOptions = {
        hideScrollbar: false,
        placeFocusBack: false,
        Hash: false,
        Carousel: {
          Thumbs: {
            type: 'classic' as const,
            Carousel: {
              vertical: true,
              center: (ref: any) => {
                return ref.getTotalSlideDim() > ref.getViewportDim();
              },
            },
          },
          Toolbar: {
            display: {
              left: ['infobar'],
              middle: [],
              right: ['viewOriginal', 'toggleFull', 'fullscreen', 'thumbs', 'close'],
            },
          },
        },
        ...options,
      };

      Fancybox.bind(root, "[data-fancybox]", fancyboxOptions);
      return () => Fancybox.unbind(root, "[data-fancybox]");
    }
  }, [root, options]);

  return [setRoot];
}
