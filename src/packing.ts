import {
    TableInfRaw,
    ListInfRaw,
    ClassInf,
    ClassObj,
    ClassObjClass,
    DataInf,
    Value,
    getStringValue
} from "./types";

export type TablePacked = {
    // Value is "Ministry + Survey + Row"
    tbls: Record<string,
        Record<string, {
            c: string[];            // Dimension IDs ("statsDataId", "title")
            r: Array<Array<string>>;      // rows
        }>
    >;
};

export type SurveyListPacked = {
    // Value is "Ministry + Row"
    svys: Record<string, {
        c: string[];            // Dimension IDs ("statsCode", "name")
        r: Array<Array<string>>;      // rows
    }>;
};

export type MetaPacked = {
    // List of dimension IDs (e.g., ["cat01","cat02","cat03","area","time"])
    dims: string[];

    // Dimension metadata
    m: Record<string, {
        n: string;                 // Dimension name
        l: Record<string, string>; // code -> label
        u?: Record<string, string>; // code -> unit
        d?: string;                // description
        e?: string;                // explanation
    }>;
};

function toArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
}

// Pack TableInf
export function packTableInf(tableInf: TableInfRaw): TablePacked {
    const tbls: TablePacked["tbls"] = {};
    const ids = new Set<string>();
    const tableInfs = toArray(tableInf);

    for (const tbl of tableInfs) {
        const id = tbl['@id']
        const govOrg = tbl.GOV_ORG.$;
        const statisticsName = tbl.STATISTICS_NAME;

        if (!tbls[govOrg]) {
            tbls[govOrg] = {};
        }
        if (!tbls[govOrg][statisticsName]) {
            tbls[govOrg][statisticsName] = { c: ["statsDataId", "title"], r: [] };
        }

        // Remove duplicates
        if (!ids.has(id)) {
            ids.add(id)
            tbls[govOrg][statisticsName].r.push([id, getStringValue(tbl.TITLE)]);
        }
    }

    return { tbls };
}

// Pack ListInf
export function packListInf(listInf: ListInfRaw): SurveyListPacked {
    const svys: SurveyListPacked["svys"] = {};
    const listInfs = toArray(listInf);

    for (const svy of listInfs) {
        const id = svy['@id']
        const govOrg = svy.GOV_ORG.$;

        if (!svys[govOrg]) {
            svys[govOrg] = { c: ["statsCode", "name"], r: [] };
        }

        svys[govOrg].r.push([id, svy.STAT_NAME.$]);
    }

    return { svys };
}

// Pack ClassInf
export function packClassInf(classInf: ClassInf): MetaPacked {
    const m: MetaPacked["m"] = {};
    const dims: string[] = [];

    for (const obj of classInf.CLASS_OBJ) {
        const id = obj["@id"];
        dims.push(id);

        const label: Record<string, string> = {};
        const unit: Record<string, string> = {};

        for (const c of toArray(obj.CLASS)) {
            label[c["@code"]] = c["@name"];
            if (c["@unit"]) unit[c["@code"]] = c["@unit"];
        }

        m[id] = {
            n: obj["@name"],
            l: label,
            ...(Object.keys(unit).length ? { u: unit } : {}),
            ...(obj["@description"] ? { d: obj["@description"] } : {}),
            ...(obj.EXPLANATION ? { e: obj.EXPLANATION } : {})
        };
    }

    return { dims, m };
}

export interface ValueColDef {
    code: string;
    label: string;
    unit?: string;
}

export type DataPacked = {
    /** Dimension ID of the pivot axis (undefined if none) */
    pivotDim?: string;

    /** Definition of pivoted value columns */
    valueCols: ValueColDef[];

    /** Dimensions with identical values across all rows (excluded from row data) */
    fixed?: Record<string, string>;

    /** Dimension IDs remaining in rows (excluding value columns) */
    dims: string[];

    /** Each row: [...values for dims, ...values for valueCols] */
    rows: Array<Array<string | number | null>>;

    na?: Record<string, string>;
    annDict?: Record<string, string>;
    /** [Row index, Value column index, annCode] */
    annRows?: Array<[number, number, string]>;
};

function normalizeValue(x: string | number): number | string | null {
    if (typeof x === "number") return x;
    const s = x.trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
}

/** List of keys for tab, cat01..cat15 */
const PIVOT_CANDIDATE_KEYS = [
    "tab",
    ...Array.from({ length: 15 }, (_, i) => `cat${String(i + 1).padStart(2, "0")}`),
] as const;

/** All possible keys for dims (including area, time) */
const ALL_DIM_KEYS = [...PIVOT_CANDIDATE_KEYS, "area", "time"] as const;

/* ================================================================
   Automatic detection of pivot axis
   ================================================================ */

/**
 * Detects the dimension that serves as the pivot axis from the CLASS_OBJ array.
 *
 * Criterion:
 *   Searches for a CLASS_OBJ among tab and cat01..cat15 where at least one CLASS entry has a @unit.
 *   If found, that CLASS_OBJ becomes the pivot axis.
 *
 * @returns [ClassObj of the pivot axis, its ID] or null
 */
function detectPivotDim(
    classInf: ClassInf
): { pivotObj: ClassObj; pivotId: string } | null {
    const candidateSet = new Set<string>(PIVOT_CANDIDATE_KEYS);

    for (const obj of classInf.CLASS_OBJ) {
        const id = obj["@id"];
        if (!candidateSet.has(id)) continue;

        const classes = toArray(obj.CLASS);
        const hasUnit = classes.some((c) => c["@unit"] != null);
        if (hasUnit) {
            return { pivotObj: obj, pivotId: id };
        }
    }

    return null;
}

/* ================================================================
   packDataInf (Pivot + Promotion of fixed values)
   ================================================================ */

/**
 * Packs DataInf.
 *
 * - If a dimension in CLASS_OBJ contains @unit, it is used as the pivot axis and converted to wide format.
 * - If no dimension contains @unit, no pivot is performed, and there is only one value column.
 * - Dimensions with identical values across all rows are promoted to 'fixed' and excluded from row data.
 *
 * @param dataInf    DATA_INF from API
 * @param classObjs  CLASS_INF.CLASS_OBJ (Used for pivot axis detection and label resolution)
 */
export function packDataInf(
    dataInf: DataInf,
    classInf: ClassInf,
): DataPacked {
    const pivot = detectPivotDim(classInf);

    // ── 1. Build valueCols for the pivot axis ──
    let pivotId: string | undefined;
    let pivotCodes: string[];
    let pivotIndex: Map<string, number>;
    let valueCols: ValueColDef[];

    if (pivot) {
        pivotId = pivot.pivotId;
        const classes = toArray(pivot.pivotObj.CLASS) as ClassObjClass[];
        pivotCodes = classes.map((c) => c["@code"]);
        pivotIndex = new Map(pivotCodes.map((code, i) => [code, i]));
        valueCols = classes.map((c) => ({
            code: c["@code"],
            label: c["@name"],
            ...(c["@unit"] ? { unit: c["@unit"] } : {}),
        }));
    } else {
        // No pivot -> Only one value column
        pivotCodes = [];
        pivotIndex = new Map();
        valueCols = [{ code: "_", label: "value" }];
    }

    // ── 2. Detect dimensions appearing in data (excluding pivot axis and unit) ──
    const excludeFromDims = new Set<string>();
    if (pivotId) excludeFromDims.add(pivotId);
    excludeFromDims.add("unit"); // unit is already represented in valueCols (or not needed)

    const present = new Set<string>();
    for (const row of toArray(dataInf.VALUE)) {
        for (const k of ALL_DIM_KEYS) {
            if (excludeFromDims.has(k)) continue;
            const attr = `@${k}` as keyof Value;
            if (row[attr] != null) present.add(k);
        }
    }

    // Stabilize dimension order (tab, cat02..cat15, area, time)
    const candidateDims: string[] = [];
    for (const k of ALL_DIM_KEYS) {
        if (!excludeFromDims.has(k) && present.has(k)) {
            candidateDims.push(k);
        }
    }

    // ── 3. Promote dimensions with identical values across all rows to 'fixed' ──
    const uniqueValuesPerDim = new Map<string, Set<string>>();
    for (const dim of candidateDims) {
        uniqueValuesPerDim.set(dim, new Set());
    }
    for (const row of toArray(dataInf.VALUE)) {
        for (const dim of candidateDims) {
            const attr = `@${dim}` as keyof Value;
            const v = row[attr] as string | undefined;
            if (v != null) uniqueValuesPerDim.get(dim)!.add(v);
        }
    }

    const fixed: Record<string, string> = {};
    const dims: string[] = [];
    for (const dim of candidateDims) {
        const uniq = uniqueValuesPerDim.get(dim)!;
        if (uniq.size === 1) {
            fixed[dim] = [...uniq][0];
        } else {
            dims.push(dim);
        }
    }

    // ── 4. Group rows and pivot ──
    const groupMap = new Map<
        string,
        {
            dimValues: Array<string | null>;
            values: Array<string | number | null>;
            annotations: Array<[number, string]>;
        }
    >();

    for (const row of toArray(dataInf.VALUE)) {
        // Extract values for remaining dimensions
        const dimValues: Array<string | null> = dims.map((dim) => {
            const attr = `@${dim}` as keyof Value;
            return (row[attr] as string | undefined) ?? null;
        });

        const groupKey = dimValues.join("\x00");

        if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
                dimValues,
                values: new Array(valueCols.length).fill(null),
                annotations: [],
            });
        }

        const group = groupMap.get(groupKey)!;

        // Store values
        let colIdx: number;
        if (pivotId) {
            const pivotCode = row[`@${pivotId}` as keyof Value] as
                | string
                | undefined;
            if (pivotCode == null) continue;
            const idx = pivotIndex.get(pivotCode);
            if (idx == null) continue;
            colIdx = idx;
        } else {
            colIdx = 0;
        }

        group.values[colIdx] = normalizeValue(row.$);

        if (row["@annotation"]) {
            group.annotations.push([colIdx, row["@annotation"]]);
        }
    }

    // ── 5. Assemble results ──
    const rows: DataPacked["rows"] = [];
    const annRows: DataPacked["annRows"] = [];

    for (const group of groupMap.values()) {
        const rowIdx = rows.length;
        rows.push([...group.dimValues, ...group.values]);

        for (const [colIdx, annCode] of group.annotations) {
            annRows.push([rowIdx, colIdx, annCode]);
        }
    }

    // NOTE / ANNOTATION dictionary
    const na = dataInf.NOTE?.length
        ? Object.fromEntries(dataInf.NOTE.map((n) => [n["@char"], n.$]))
        : undefined;
    const annDict = dataInf.ANNOTATION?.length
        ? Object.fromEntries(
            dataInf.ANNOTATION.map((a) => [a["@annotation"], a.$])
        )
        : undefined;

    // ── 6. Pack ──
    const packed: DataPacked = { dims, valueCols, rows };
    if (pivotId) packed.pivotDim = pivotId;
    if (Object.keys(fixed).length) packed.fixed = fixed;
    if (na) packed.na = na;
    if (annDict) packed.annDict = annDict;
    if (annRows.length) packed.annRows = annRows;

    return packed;
}
