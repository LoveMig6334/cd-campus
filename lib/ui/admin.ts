import { CATEGORY_COLOR } from "@/lib/types";

/** Color used for placement-rank pills (rank → CSS color). */
export const PLACEMENT_COLOR: Record<1 | 2 | 3 | 4, string> = {
  1: CATEGORY_COLOR.academic,
  2: CATEGORY_COLOR.sport,
  3: CATEGORY_COLOR.tradition,
  4: CATEGORY_COLOR.music,
};
