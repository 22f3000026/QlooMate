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
  | "filterPublicationYearMin"
  | "filterPublicationYearMax"
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

export interface BookParams extends ExtractedParams {
  filterType: FilterType.Book;
}
