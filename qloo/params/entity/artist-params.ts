import { QlooParams } from "@/services/qloo/params/common";
import { FilterType } from "@/services/qloo/params/common/supporting-types.ts";

export type ExtractedParams = Pick<
  QlooParams,
  | "biasTrends"
  | "filterExcludeEntities"
  | "filterParentsTypes"
  | "filterPopularityMax"
  | "filterExcludeTags"
  | "filterExternalExists"
  | "operatorFilterExternalExists"
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

export interface ArtistParams extends ExtractedParams {
  filterType: FilterType.Artist;
}
