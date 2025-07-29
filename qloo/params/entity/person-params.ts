import { QlooParams } from "@/services/qloo/params/common";
import { FilterType } from "@/services/qloo/params/common/supporting-types.ts";

export type ExtractedParams = Pick<
  QlooParams,
  | "biasTrends"
  | "filterDateOfBirthMin"
  | "filterDateOfBirthMax"
  | "filterDateOfDeathMin"
  | "filterDateOfDeathMax"
  | "filterExcludeEntities"
  | "filterExternalExists"
  | "operatorFilterExternalExists"
  | "filterExcludeTags"
  | "operatorExcludeTags"
  | "filterGender"
  | "filterParentsTypes"
  | "filterPopularityMin"
  | "filterPopularityMax"
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

export interface PersonParams extends ExtractedParams {
  filterType: FilterType.Person;
}
