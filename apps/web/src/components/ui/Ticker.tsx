/**
 * Spec ticker.
 *
 * A marquee is usually a decoration. This one is not: it states, at the top
 * of the homepage, the operating terms of the business — turnaround, warranty,
 * what the guarantee actually covers. It is the fastest way to communicate
 * "we are a real workshop" before the visitor scrolls.
 *
 * Implemented as two identical runs translated -50%, so the loop is seamless
 * and continuous regardless of content length. Pauses on hover so a visitor
 * can actually read a line, and is fully disabled under reduced-motion.
 */
export const Ticker = ({ items, speed = 52 }: { items: string[]; speed?: number }) => {
  const run = (
    <ul className="flex shrink-0 items-center" aria-hidden="true">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex shrink-0 items-center">
          <span className="whitespace-nowrap px-8 font-mono text-[10px] uppercase tracking-technical text-slate">
            {item}
          </span>
          <span className="h-1 w-1 shrink-0 bg-volt/60" />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="group relative flex overflow-hidden border-y border-hairline bg-gunmetal py-3.5 mask-fade-x"
      style={{ ['--marquee-duration' as string]: `${speed}s` }}
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {run}
        {run}
      </div>
    </div>
  );
};
