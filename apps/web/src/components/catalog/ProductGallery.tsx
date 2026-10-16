'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ProductImage } from '@arkvolt/shared';

/**
 * Gallery with a technical-drawing frame: corner brackets, a figure counter,
 * and a hairline rule between the media and the index. Single image falls
 * through to a plain framed plate rather than a broken thumbnail rail.
 */
export const ProductGallery = ({ images, name }: { images: ProductImage[]; name: string }) => {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="bracket bracket-lg relative flex aspect-square items-center justify-center border border-hairline bg-plate">
        <span className="font-mono text-[10px] uppercase tracking-technical text-slate">
          Photography pending
        </span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div>
      <div className="bracket bracket-lg group relative border border-hairline bg-plate">
        <div className="relative aspect-square overflow-hidden">
          <Image
            key={current.url}
            src={current.url}
            alt={current.alt || name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="animate-fade-up object-cover"
          />
        </div>

        <span className="absolute bottom-4 right-4 border border-hairline-strong bg-void/85 px-2.5 py-1 font-mono text-[10px] tabular-nums uppercase tracking-technical text-steel backdrop-blur-sm">
          Fig. {String(active + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-px bg-hairline">
          {images.map((image, i) => (
            <button
              key={image.url + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}: ${image.alt || name}`}
              aria-current={i === active}
              className={`relative aspect-square overflow-hidden bg-plate transition-opacity duration-200 ${
                i === active ? 'opacity-100' : 'opacity-45 hover:opacity-80'
              }`}
            >
              <Image src={image.url} alt="" fill sizes="120px" className="object-cover" />
              {i === active && <span className="absolute inset-0 border border-volt" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
