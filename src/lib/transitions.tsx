import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import type { Brand } from "./types";

/** Short distance so scenes never travel outside the safe zone while sliding. */
const SLIDE_PX = 40;

const SubtleSlide: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({
  children,
  presentationDirection,
  presentationProgress,
}) => {
  const entering = presentationDirection === "entering";
  const offset = entering ? (1 - presentationProgress) * SLIDE_PX : -presentationProgress * SLIDE_PX;
  const opacity = entering ? presentationProgress : 1 - presentationProgress;
  return <div style={{ position: "absolute", inset: 0, opacity, transform: `translateX(${offset}px)` }}>{children}</div>;
};

/** Scene transition for the brand's style: fade, a subtle slide + fade, or a wipe. */
export const brandTransition = (brand: Brand): TransitionPresentation<Record<string, unknown>> => {
  switch (brand.style.transition) {
    case "slide":
      return { component: SubtleSlide, props: {} } as TransitionPresentation<Record<string, unknown>>;
    case "wipe":
      return wipe({ direction: "from-left" }) as TransitionPresentation<Record<string, unknown>>;
    default:
      return fade() as TransitionPresentation<Record<string, unknown>>;
  }
};
