import { QlooParams } from "@/services/qloo/params/common";
import { FilterType } from "@/services/qloo/params/common/supporting-types.ts";

export type ExtractedParams = Pick<
  QlooParams,
  | "biasTrends"
  | "filterExcludeEntities"
  | "filterExcludeTags"
  | "operatorExcludeTags"
  | "filterExternalExists"
  | "operatorFilterExternalExists"
  | "filterParentsTypes"
  | "filterPopularityMin"
  | "filterPopularityMax"
  | "filterResultsEntities"
  | "filterResultsEntitiesQuery"
  | "filterTags"
  | "operatorFilterTags"
  | "offset"
  | "signalDemographicsGender"
  | "signalDemographicsAge"
  | "signalDemographicsAudiences"
  | "signalDemographicsAudiencesWeight"
  | "signalInterestsEntities"
  | "signalInterestsTags"
  | "take"
>;

export interface PodcastParams extends ExtractedParams {
  filterType: FilterType.Podcast;
}
