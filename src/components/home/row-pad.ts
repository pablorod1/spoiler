/**
 * Side padding (and matching snap padding) that lines a row's first card up with `.container-page`
 * text, including on screens wider than its 1440px max width. (An arbitrary @media variant: Tailwind
 * emits `min-[1440px]:` before `xl:`, which would then override it.)
 */
export const ROW_PAD =
  "scroll-px-4 px-4 md:scroll-px-8 md:px-8 xl:scroll-px-12 xl:px-12 [@media(min-width:1440px)]:scroll-px-[calc((100vw-1440px)/2+3rem)] [@media(min-width:1440px)]:px-[calc((100vw-1440px)/2+3rem)]";
