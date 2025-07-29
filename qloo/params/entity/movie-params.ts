import { QlooParams } from "@/services/qloo/params/common";
import { FilterType } from "@/services/qloo/params/common/supporting-types.ts";

export type ExtractedParams = Pick<
  QlooParams,
  | "biasTrends"
  | "filterContentRating"
  | "filterExcludeEntities"
  | "filterExternalExists"
  | "operatorFilterExternalExists"
  | "filterExcludeTags"
  | "operatorExcludeTags"
  | "filterParentsTypes"
  | "filterPopularityMin"
  | "filterPopularityMax"
  | "filterReleaseYearMin"
  | "filterReleaseYearMax"
  | "filterReleaseCountry"
  | "operatorFilterReleaseCountry"
  | "filterRatingMin"
  | "filterRatingMax"
  | "filterResultsEntities"
  | "filterResultsEntitiesQuery"
  | "filterTags"
  | "operatorFilterTags"
  | "offset"
  | "signalDemographicsAudiences"
  | "signalDemographicsAge"
  | "signalDemographicsAudiencesWeight"
  | "signalDemographicsGender"
  | "signalInterestsEntities"
  | "signalInterestsTags"
  | "take"
>;

export interface MovieParams extends ExtractedParams {
  filterType: FilterType.Movie;
}
