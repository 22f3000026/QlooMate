import axios from "axios";
import {
  FilterType,
  LogicOperator,
} from "@/services/qloo/params/common/supporting-types.ts";

const { VITE_QLOO_API_URL, VITE_QLOO_API_KEY } = import.meta.env;

const qlooClient = axios.create({
  baseURL: VITE_QLOO_API_URL,
  headers: {
    Accept: "application/json",
    "x-api-key": VITE_QLOO_API_KEY,
  },
});

export const getTagsByKeyword = async (keyword: string): Promise<any[]> => {
  try {
    const response = await qlooClient.get("/v2/tags", {
      params: {
        "filter.query": keyword,
      },
    });
    return response.data.results.tags;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getEntitiesByKeyword = async (keyword: string): Promise<any[]> => {
  const supportedEntities = Object.values(FilterType) as string[];

  try {
    const response = await qlooClient.get("/search", {
      params: {
        query: keyword,
        "operator.filter.tags": LogicOperator.Union,
        page: 1,
        sort_by: "match",
      },
    });
    const results = response.data.results;
    return results.filter((res: any) =>
      // Entity search also returns tags, so we want to get rid of them
      res.types.find(
        (type: string) =>
          type.includes("entity") && supportedEntities.includes(type),
      ),
    );
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const fetchInsightsDeepDive = async (args: any) => {
  try {
    const params = Object.entries(args)
      .filter(([key]) => !key.includes("tag"))
      .reduce<Record<string, any>>((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
    const response = await qlooClient.get("/v2/insights", {
      params,
    });
    return response.data;
  } catch (e) {
    console.error(e);
    return [];
  }
};
