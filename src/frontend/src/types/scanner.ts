export type CornerPoint = { x: number; y: number };

/** Index 0=TL, 1=TR, 2=BR, 3=BL */
export type CornerPoints = [CornerPoint, CornerPoint, CornerPoint, CornerPoint];

/** 3×3 row-major homography matrix as a flat Float64Array of length 9 */
export type HomographyMatrix = Float64Array;
