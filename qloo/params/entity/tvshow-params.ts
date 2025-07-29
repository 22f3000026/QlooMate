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
  | "filterFinaleYearMax"
  | "filterFinaleYearMin"
  | "filterLatestKnownYearMax"
  | "filterLatestKnownYearMin"
  | "filterParentsTypes"
  | "filterPopularityMax"
  | "filterPopularityMin"
  | "filterReleaseYearMax"
  | "filterReleaseYearMin"
  | "filterReleaseCountry"
  | "operatorFilterReleaseCountry"
  | "filterRatingMax"
  | "filterRatingMin"
  | "filterResultsEntities"
  | "filterResultsEntitiesQuery"
  | "filterTags"
  | "operatorFilterTags"
  | "offset"
  | "signalDemographicsAge"
  | "signalDemographicsAudiences"
  | "signalDemographicsAudiencesWeight"
  | "signalDemographicsGender"
  | "signalInterestsEntities"
  | "signalInterestsTags"
  | "take"
>;

export interface TVShowParams extends ExtractedParams {
  filterType: FilterType.TVShow;
}
