/**
 * Common structure with "@code" and "$"
 */
export interface CodeValue {
    '@code': string;
    $: string;
}

export interface API_StatsList {
    GET_STATS_LIST: StatsList;
}

export interface StatsList {
    RESULT: Result;
    PARAMETER: Parameter;
    DATALIST_INF: DataListInf;
}

/* ────── Parameter ────── */
export interface Parameter {
    LANG: string;
    DATA_FORMAT?: string;
    SURVEY_YEARS?: string;
    OPEN_YEARS?: string;
    STATS_FIELD?: string;
    STATS_CODE?: string;
    SMALL_AREA?: number;
    SEARCH_WORD?: string;
    SEARCH_KIND?: string;
    COLLECT_AREA?: string;
    EXPLANATION_GET_FLG?: string;
    STATS_NAME_LIST?: string;
    START_POSITION?: number;
    LIMIT?: number;
    UPDATED_DATE?: string;
}

/* ────── Result Info ────── */
export interface Result {
    STATUS: number;
    ERROR_MSG: string;
    DATE: string;
}

/* ────── Data List Info ────── */

/* === "TABLE_INF" and "LIST_INF" returned by API = Array OR Single object ================= */
export type TableInfRaw = TableInf | TableInf[];
export type ListInfRaw = ListInf | ListInf[];

export interface DataListInf {
    NUMBER: number;
    RESULT_INF: ListResultInf;
    TABLE_INF: TableInfRaw;
    LIST_INF: ListInfRaw;
}

export interface ListResultInf {
    FROM_NUMBER: number;
    TO_NUMBER: number;
    NEXT_KEY?: number;
}
export interface ListInf {
    '@id': string;
    STAT_NAME: CodeValue;
    GOV_ORG: CodeValue;
}

/* ────── Table Info (TableInf) ────── */
export interface TableInf {
    '@id': string;
    STAT_NAME: CodeValue;
    GOV_ORG: CodeValue;
    STATISTICS_NAME: string;
    TITLE: string | { '@no': string; $: string };
    CYCLE: string;
    SURVEY_DATE: string;
    OPEN_DATE: string;
    SMALL_AREA: number;
    COLLECT_AREA: string;
    MAIN_CATEGORY: CodeValue;
    SUB_CATEGORY: CodeValue;
    OVERALL_TOTAL_NUMBER: number;
    UPDATED_DATE: string;
    STATISTICS_NAME_SPEC: StatisticsNameSpec;
    DESCRIPTION?: Description;
    TITLE_SPEC: TitleSpec;
    releaseCount?: number;
}

export function getStringValue(obj: any): string {
    if (typeof obj === "string") {
        return obj;
    } else {
        return obj.$;
    }
}

export interface StatisticsNameSpec {
    TABULATION_CATEGORY: string;
    TABULATION_SUB_CATEGORY1?: string;
    TABULATION_SUB_CATEGORY2?: string;
    TABULATION_SUB_CATEGORY3?: string;
    TABULATION_SUB_CATEGORY4?: string;
    TABULATION_SUB_CATEGORY5?: string;
}
export interface Description {
    TABULATION_CATEGORY_EXPLANATION: string;
    TABULATION_SUB_CATEGORY_EXPLANATION1?: string;
    TABULATION_SUB_CATEGORY_EXPLANATION2?: string;
    TABULATION_SUB_CATEGORY_EXPLANATION3?: string;
    TABULATION_SUB_CATEGORY_EXPLANATION4?: string;
    TABULATION_SUB_CATEGORY_EXPLANATION5?: string;
}
export interface TitleSpec {
    TABLE_CATEGORY?: string;
    TABLE_NAME: string;
    TABLE_EXPLANATION?: string;
    TABLE_SUB_CATEGORY1?: string;
    TABLE_SUB_CATEGORY2?: string;
    TABLE_SUB_CATEGORY3?: string;
}

/* ----------------------------------------------
   MetaInfo (GET_META_INFO)
---------------------------------------------- */
export interface API_MetaInfo {
    GET_META_INFO: MetaInfo;
}

export interface MetaInfo {
    RESULT: Result;
    PARAMETER: MetaParameter;
    METADATA_INF: MetadataInf;
}

export interface MetaParameter {
    LANG: string;
    STATS_DATA_ID: string;
    DATA_FORMAT?: string;
    EXPLANATION_GET_FLG?: string;
}

export interface MetadataInf {
    TABLE_INF: TableInf;
    CLASS_INF: ClassInf;
}

/* ----------------------------------------------
   CLASS_OBJ
---------------------------------------------- */
export interface ClassInf {
    CLASS_OBJ: ClassObj[];
}

export interface ClassObj {
    '@id': string;
    '@name': string;
    '@description'?: string;
    EXPLANATION?: string;
    CLASS: ClassRaw;
}

export type ClassRaw = ClassObjClass | ClassObjClass[];

export interface ClassObjClass {
    '@code': string;
    '@name': string;
    '@level': string;
    '@unit'?: string;
    '@parentCode'?: string;
    '@addInf'?: string;
}

/* ----------------------------------------------
   StatsDataInfo (GET_STATS_DATA)
---------------------------------------------- */
export interface API_StatsData {
    GET_STATS_DATA: StatsDataInfo;
}

export interface StatsDataInfo {
    RESULT: Result;
    PARAMETER: StatsParameter;
    STATISTICAL_DATA: StatisticalData;
}

export interface StatsParameter {
    LANG: string;
    DATASET_ID?: string;
    STATS_DATA_ID: string;
    NARROWING_COND?: NarrowingCond;
    DATA_FORMAT?: string;
    START_POSITION?: number;
    LIMIT?: number;
    METAGET_FLG?: string;
    CNT_GET_FLG?: string;
    EXPLANATION_GET_FLG?: string;
    ANNOTATION_GET_FLG?: string;
}

/* ----------------------------------------------
   NarrowingCond
---------------------------------------------- */
export interface NarrowingCond {
    LEVEL_TAB_COND?: string;
    CODE_TAB_SELECT?: string;
    CODE_TAB_FROM?: string;
    CODE_TAB_TO?: string;

    LEVEL_TIME_COND?: string;
    CODE_TIME_SELECT?: string;
    CODE_TIME_FROM?: string;
    CODE_TIME_TO?: string;

    LEVEL_AREA_COND?: string;
    CODE_AREA_SELECT?: string;
    CODE_AREA_FROM?: string;
    CODE_AREA_TO?: string;

    LEVEL_CAT01_COND?: string; CODE_CAT01_SELECT?: string;
    CODE_CAT01_FROM?: string; CODE_CAT01_TO?: string;

    LEVEL_CAT02_COND?: string; CODE_CAT02_SELECT?: string;
    CODE_CAT02_FROM?: string; CODE_CAT02_TO?: string;

    LEVEL_CAT03_COND?: string; CODE_CAT03_SELECT?: string;
    CODE_CAT03_FROM?: string; CODE_CAT03_TO?: string;

    LEVEL_CAT04_COND?: string; CODE_CAT04_SELECT?: string;
    CODE_CAT04_FROM?: string; CODE_CAT04_TO?: string;

    LEVEL_CAT05_COND?: string; CODE_CAT05_SELECT?: string;
    CODE_CAT05_FROM?: string; CODE_CAT05_TO?: string;

    LEVEL_CAT06_COND?: string; CODE_CAT06_SELECT?: string;
    CODE_CAT06_FROM?: string; CODE_CAT06_TO?: string;

    LEVEL_CAT07_COND?: string; CODE_CAT07_SELECT?: string;
    CODE_CAT07_FROM?: string; CODE_CAT07_TO?: string;

    LEVEL_CAT08_COND?: string; CODE_CAT08_SELECT?: string;
    CODE_CAT08_FROM?: string; CODE_CAT08_TO?: string;

    LEVEL_CAT09_COND?: string; CODE_CAT09_SELECT?: string;
    CODE_CAT09_FROM?: string; CODE_CAT09_TO?: string;

    LEVEL_CAT10_COND?: string; CODE_CAT10_SELECT?: string;
    CODE_CAT10_FROM?: string; CODE_CAT10_TO?: string;

    LEVEL_CAT11_COND?: string; CODE_CAT11_SELECT?: string;
    CODE_CAT11_FROM?: string; CODE_CAT11_TO?: string;

    LEVEL_CAT12_COND?: string; CODE_CAT12_SELECT?: string;
    CODE_CAT12_FROM?: string; CODE_CAT12_TO?: string;

    LEVEL_CAT13_COND?: string; CODE_CAT13_SELECT?: string;
    CODE_CAT13_FROM?: string; CODE_CAT13_TO?: string;

    LEVEL_CAT14_COND?: string; CODE_CAT14_SELECT?: string;
    CODE_CAT14_FROM?: string; CODE_CAT14_TO?: string;

    LEVEL_CAT15_COND?: string; CODE_CAT15_SELECT?: string;
    CODE_CAT15_FROM?: string; CODE_CAT15_TO?: string;
}

/* ----------------------------------------------
   StatisticalData (GET_STATS_DATA -> STATISTICAL_DATA)
---------------------------------------------- */
export interface StatisticalData {
    RESULT_INF: DataResultInf;
    TABLE_INF: TableInf;
    CLASS_INF: ClassInf;
    DATA_INF: DataInf;
}

export interface DataResultInf {
    TOTAL_NUMBER: number;
    FROM_NUMBER?: number;
    TO_NUMBER?: number;
    NEXT_KEY?: number;
}

/* ----------------------------------------------
   DataInf (STATISTICAL_DATA -> DATA_INF)
---------------------------------------------- */
export interface DataInf {
    NOTE?: Note[];
    ANNOTATION?: Annotation[];
    VALUE: Value[];
}

export interface Note {
    '@char': string;
    $: string;
}

export interface Annotation {
    '@annotation': string;
    $: string;
}

export interface Value {
    '@tab'?: string;
    '@cat01'?: string; '@cat02'?: string; '@cat03'?: string; '@cat04'?: string;
    '@cat05'?: string; '@cat06'?: string; '@cat07'?: string; '@cat08'?: string;
    '@cat09'?: string; '@cat10'?: string; '@cat11'?: string; '@cat12'?: string;
    '@cat13'?: string; '@cat14'?: string; '@cat15'?: string;

    '@area'?: string;
    '@time'?: string;
    '@unit'?: string;
    '@annotation'?: string;

    $: string | number;
}
