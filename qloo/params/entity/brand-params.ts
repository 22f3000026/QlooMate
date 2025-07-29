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
  | "signalDemographicsAge"
  | "signalDemographicsAudiences"
  | "signalDemographicsAudiencesWeight"
  | "signalDemographicsGender"
  | "signalInterestsEntities"
  | "signalInterestsTags"
  | "offset"
  | "take"
>;

export interface BrandParams extends ExtractedParams {
  filterType: FilterType.Brand;
}
