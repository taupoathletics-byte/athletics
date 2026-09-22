import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CarouselItem {
  image: string
  name: string
  role: string
}

export function Carousel({ items }: { items: CarouselItem[] }) {
  const [index, setIndex] = React.useState(0)
  const count = items.length

  React.useEffect(() => {
    if (count <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 4000)
    return () => clearInterval(t)
  }, [count])

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count)

  if (!count) return null

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-3xl shadow-floating">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((it) => (
            <figure key={it.name} className="relative w-full shrink-0">
              <img src={it.image} alt={it.name} className="aspect-square w-full object-cover" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-16 text-white">
                <div className="text-xl font-bold">{it.name}</div>
                <div className="text-sm text-white/80">{it.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-primary shadow-soft hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-primary shadow-soft hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-4 flex justify-center gap-2">
            {items.map((it, i) => (
              <button
                key={it.name}
                type="button"
                aria-label={`Go to ${it.name}`}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  i === index ? 'w-6 bg-primary' : 'w-2.5 bg-outline-variant',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
