import { Gender, SignalWeight } from "./supporting-types.ts";

export interface QlooSignalParams {
  biasTrends?: "low" | "medium" | "high";
  signalDemographicsAudiences?: string[];
  signalDemographicsAudiencesWeight?: SignalWeight;
  signalDemographicsAge?: string;
  signalDemographicsGender?: Gender;
  signalInterestsEntities?: string[];
  signalInterestsEntitiesQuery?: string[];
  signalInterestsTags?: string;
  operatorSignalInterestsTags?: string;
  signalLocation?: string;
  signalLocationQuery?: string;
  signalLocationWeight?: SignalWeight;
  signalLocationRadius?: number;
  signalTagsWeight?: SignalWeight;
}
