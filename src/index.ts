import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { env } from "cloudflare:workers";
import {
	API_MetaInfo,
	API_StatsData,
	API_StatsList,
	getStringValue
} from "./types";
import {
	packTableInf,
	packListInf,
	packClassInf,
	packDataInf
} from "./packing";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "e-Stat API Search",
		version: "0.1.0",
	});

	BASE_URL = "https://api.e-stat.go.jp/rest/3.0/app";
	GETSTATS_ENDPOINT = `${this.BASE_URL}/json/getStatsList`;
	GETMETA_ENDPOINT = `${this.BASE_URL}/json/getMetaInfo`;
	GETDATA_ENDPOINT = `${this.BASE_URL}/json/getStatsData`;

	async init() {
		// @ts-ignore; will work on execution
		const appId = env.ESTAT_API_KEY;
		if (!appId) {
			throw new Error("ESTAT_API_KEY environment variable is not set.");
		}

		// getStatsList
		this.server.registerTool(
			"get_tables",
			{
				description: `Searches for statistical tables on the official Japanese statistics portal (e-Stat).
				Use this to retrieve a list of table names and IDs.
				For monthly surveys, there is no reference period; thus you need not specify one.
				Note that tables may share the same name but have distinct IDs, potentially with differing metadata.`,
				inputSchema: {
					lang: z.string().describe("Language code ('J' for Japanese, 'E' for English).").optional(),
					surveyYears: z.string().describe("Survey reference period in one of the following formats: yyyy, yyyymm, or yyyymm-yyyymm.").optional(),
					openYears: z.string().describe("Dissemination year of the statistics in one of the following formats: yyyy, yyyymm, or yyyymm-yyyymm.").optional(),
					statsField: z.string().describe("Statistical classification code (2 or 4 digits).").optional(),
					statsCode: z.string().describe("Ministry code (5 digits) or survey ID (8 digits).").optional(),
					searchWord: z.string().describe("Search terms; multiple words can be combined using 'AND' or 'OR'.").optional(),
					searchKind: z.number().describe("Type of survey: 1 = general statistics, 2 = small-area or mesh census statistics.").optional(),
					// Pending
					// collectArea: z.string().describe("1: All Japan, 2: By prefectures, 3: By municipalities"),
					startPosition: z.number().describe("Offset for pagination; skip this many records before returning results.").optional(),
					limit: z.number().describe("Maximum number of results to return.").optional(),
					updatedDate: z.string().describe("Update date of the results in one of the following formats: yyyy, yyyymm, or yyyymm-yyyymm.").optional()
				}
			},
			async (params, extra) => {
				const url = new URL(this.GETSTATS_ENDPOINT);

				url.searchParams.append("appId", appId);
				for (const [key, value] of Object.entries(params)) {
					if (value !== undefined) {
						url.searchParams.append(key, String(value));
					}
				}
				// Surpress long explanation
				url.searchParams.append("explanationGetFlg", "N");
				// Default limit
				if (!params.limit) {
					url.searchParams.append("limit", "100");
				}

				const response = await fetch(url.toString(), {
					headers: { Accept: 'application/json' },
				});
				if (!response.ok) {
					throw new Error(`e-Stat API error: ${response.status} ${response.statusText}`);
				}

				const data = await response.json() as API_StatsList;
				const statsList = data.GET_STATS_LIST;
				if (statsList.RESULT.STATUS !== 0 || !statsList.DATALIST_INF) {
					throw new Error(`e-Stat API error ${statsList.RESULT.ERROR_MSG}`);
				}

				const tablePacked = packTableInf(statsList.DATALIST_INF.TABLE_INF);

				const result: { type: "text"; text: string }[] = [{ type: "text", text: JSON.stringify(tablePacked) }];
				if (statsList.DATALIST_INF.RESULT_INF.NEXT_KEY !== undefined) {
					result.push({ type: "text", text: `This is a part of results. Request with 'startPosition: ${statsList.DATALIST_INF.RESULT_INF.NEXT_KEY}' to get the next part.` });
				}

				return {
					content: result
				};
			}
		);
		// getStatsList
		this.server.registerTool(
			"get_surveys",
			{
				description: `Searches for surveys with available results on e-Stat. Use this when you are uncertain which survey is suitable for your context.`,
				inputSchema: {
					lang: z.string().describe("Language code ('J' for Japanese, 'E' for English).").optional(),
					surveyYears: z.string().describe("Survey reference period in one of the following formats: yyyy, yyyymm, or yyyymm-yyyymm.").optional(),
					openYears: z.string().describe("Dissemination year of the statistics in one of the following formats: yyyy, yyyymm, or yyyymm-yyyymm.").optional(),
					statsField: z.string().describe("Statistical classification code (2 or 4 digits).").optional(),
					statsCode: z.string().describe("Ministry code (5 digits) or survey ID (8 digits).").optional(),
					searchWord: z.string().describe("Search terms; multiple words can be combined using 'AND' or 'OR'.").optional(),
					searchKind: z.number().describe("Type of survey: 1 = general statistics, 2 = small-area or mesh census statistics.").optional(),
					// Pending
					// collectArea: z.string().describe("1: All Japan, 2: By prefectures, 3: By municipalities"),
					startPosition: z.number().describe("Offset for pagination; skip this many records before returning results.").optional(),
					limit: z.number().describe("Maximum number of results to return.").optional(),
					updatedDate: z.string().describe("Update date of the results in one of the following formats: yyyy, yyyymm, or yyyymm-yyyymm.").optional()
				}
			},
			async (params, extra) => {
				const url = new URL(this.GETSTATS_ENDPOINT);

				url.searchParams.append("appId", appId);
				for (const [key, value] of Object.entries(params)) {
					if (value !== undefined) {
						url.searchParams.append(key, String(value));
					}
				}
				// Get only survey name and ID
				url.searchParams.append("statsNameList", "Y");
				// Default limit
				if (!params.limit) {
					url.searchParams.append("limit", "1000");
				}

				const response = await fetch(url.toString(), {
					headers: { Accept: 'application/json' },
				});
				if (!response.ok) {
					throw new Error(`e-Stat API error: ${response.status} ${response.statusText}`);
				}

				const data = await response.json() as API_StatsList;
				const statsList = data.GET_STATS_LIST;
				if (statsList.RESULT.STATUS !== 0 || !statsList.DATALIST_INF) {
					throw new Error(`e-Stat API error ${statsList.RESULT.ERROR_MSG}`);
				}

				const listPacked = packListInf(statsList.DATALIST_INF.LIST_INF);

				const result: { type: "text"; text: string }[] = [{ type: "text", text: JSON.stringify(listPacked) }];
				if (statsList.DATALIST_INF.RESULT_INF.NEXT_KEY !== undefined) {
					result.push({ type: "text", text: `This is a part of results. Request with 'startPosition: ${statsList.DATALIST_INF.RESULT_INF.NEXT_KEY}' to get the next part.` });
				}

				return {
					content: result
				};
			}
		);
		// getMetaInfo
		this.server.registerTool(
			"get_metadata",
			{
				description: `Retrieves metadata for a specified table. If you do not know the table ID, use 'get_tables' first.`,
				inputSchema: {
					statsDataId: z.string().describe("ID of the statistical table")
				}
			},
			async (params, extra) => {
				const url = new URL(this.GETMETA_ENDPOINT);

				url.searchParams.append("appId", appId);
				for (const [key, value] of Object.entries(params)) {
					if (value !== undefined) {
						url.searchParams.append(key, String(value));
					}
				}
				// Surpress long explanation
				url.searchParams.append("explanationGetFlg", "N");

				const response = await fetch(url.toString(), {
					headers: { Accept: 'application/json' },
				});
				if (!response.ok) {
					throw new Error(`e-Stat API error: ${response.status} ${response.statusText}`);
				}

				const data = await response.json() as API_MetaInfo;
				const metaInfo = data.GET_META_INFO;
				if (metaInfo.RESULT.STATUS !== 0) {
					throw new Error(`e-Stat API error ${metaInfo.RESULT.ERROR_MSG}`);
				}

				const id = metaInfo.METADATA_INF.TABLE_INF["@id"];
				const tbltitle = getStringValue(metaInfo.METADATA_INF.TABLE_INF.TITLE);
				const classInf = metaInfo.METADATA_INF.CLASS_INF

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								statsDataId: id,
								title: tbltitle,
								metaInfo: packClassInf(classInf)
							})
						}
					]
				};
			}
		);
		// getStatsData
		this.server.registerTool(
			"get_data",
			{
				description: `Fetches data for the specified table. If you do not know the table ID, use 'get_tables' first.
				Use metadata to apply filters.`,
				inputSchema: {
					statsDataId: z.string().describe("ID of the statistical table"),
					cdTab: z.string().describe("Item code for filtering data").optional(),
					cdTime: z.string().describe("Time code for filtering data").optional(),
					cdArea: z.string().describe("Area code for filtering data").optional(),
					cdCat01: z.string().describe("Category 1 code for filtering data").optional(),
					cdCat02: z.string().describe("Category 2 code for filtering data").optional(),
					cdCat03: z.string().describe("Category 3 code for filtering data").optional(),
					cdCat04: z.string().describe("Category 4 code for filtering data").optional(),
					cdCat05: z.string().describe("Category 5 code for filtering data").optional(),
					cdCat06: z.string().describe("Category 6 code for filtering data").optional(),
					cdCat07: z.string().describe("Category 7 code for filtering data").optional(),
					cdCat08: z.string().describe("Category 8 code for filtering data").optional(),
					cdCat09: z.string().describe("Category 9 code for filtering data").optional(),
					cdCat10: z.string().describe("Category 10 code for filtering data").optional(),
					startPosition: z.number().describe("Offset for pagination; skip this many records before returning results.").optional(),
					limit: z.number().describe("Maximum number of results to return.").optional(),
					metaGetFlg: z.string().describe("Whether to retrieve descriptions for metadata codes ('Y' or 'N').").optional(),
					annotationGetFlg: z.string().describe("Whether to retrieve descriptions for annotated non‑numeric values ('Y' or 'N').").optional()
				}
			},
			async (params, extra) => {
				const url = new URL(this.GETDATA_ENDPOINT);

				url.searchParams.append("appId", appId);
				for (const [key, value] of Object.entries(params)) {
					if (value !== undefined) {
						url.searchParams.append(key, String(value));
					}
				}
				// Surpress long explanation
				url.searchParams.append("explanationGetFlg", "N");

				const response = await fetch(url.toString());
				if (!response.ok) {
					throw new Error(`e-Stat API error: ${response.status} ${response.statusText}`);
				}

				const data = await response.json() as API_StatsData;
				const statsData = data.GET_STATS_DATA;
				if (statsData.RESULT.STATUS !== 0) {
					throw new Error(`e-Stat API error ${statsData.RESULT.ERROR_MSG}`);
				}

				const packedData = packDataInf(statsData.STATISTICAL_DATA.DATA_INF, statsData.STATISTICAL_DATA.CLASS_INF)

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(packedData)
						}
					]
				};
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
