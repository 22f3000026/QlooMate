export interface QlooOutputParams {
  diversifyBy?: string;
  diversifyTake?: number;
  featureExplainability?: boolean;
  offset?: number;
  outputHeatmapBoundary?: string;
  page?: number;
  sortBy?: "affinity" | "distance";
  take?: number;
}
