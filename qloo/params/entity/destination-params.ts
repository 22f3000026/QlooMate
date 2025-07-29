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
  | "filterGeocodeName"
  | "filterGeocodeAdmin1Region"
  | "filterGeocodeAdmin2Region"
  | "filterGeocodeCountryCode"
  | "filterLocation"
  | "filterLocationRadius"
  | "filterLocationGeohash"
  | "filterExcludeLocationGeohash"
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

export interface DestinationParams extends ExtractedParams {
  filterType: FilterType.Destination;
}
