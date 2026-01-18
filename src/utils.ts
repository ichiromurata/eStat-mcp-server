import { AtTrimmedValue, GroupingResult, OptimizedGroup, TableInf } from "./types";

export function tableToString(t: TableInf): string {
    return `${t['@id']},${t.TITLE['@no']},${t.TITLE.$},${t.STATISTICS_NAME},${t.GOV_ORG.$}`;
}

export function toArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
}

// -----------------------------------------------------------
// @ を取り除くヘルパー
// -----------------------------------------------------------
export function stripAtPrefix(obj: any): AtTrimmedValue {
    const res: any = {};
    for (const key in obj) {
        if (key.startsWith("@")) res[key.slice(1)] = obj[key];
        else res[key] = obj[key];
    }
    return res as AtTrimmedValue;
}

/**
 * 値として扱うキー（メタデータから除外するキー）
 */
const VALUE_KEYS = ["$"];

/**
 * JSONデータのサイズを計算
 */
function calculateSize(data: any): number {
    return JSON.stringify(data).length;
}

/**
 * キーが値フィールドかどうかを判定
 */
function isValueKey(key: string): boolean {
    return VALUE_KEYS.includes(key);
}

/**
 * 2つのオブジェクトで共通するプロパティを抽出（値フィールドを除外）
 */
function findCommonProperties(obj1: AtTrimmedValue, obj2: AtTrimmedValue): { [key: string]: any } {
    const common: { [key: string]: any } = {};

    for (const key in obj1) {
        if (isValueKey(key)) continue; // "$"などの値フィールドはスキップ

        if (key in obj2 && obj1[key] === obj2[key]) {
            common[key] = obj1[key];
        }
    }

    return common;
}

/**
 * 複数のオブジェクトで共通するプロパティを計算（値フィールドを除外）
 */
function findCommonInArray(items: AtTrimmedValue[]): { [key: string]: any } {
    if (items.length === 0) return {};

    // 最初のアイテムから値フィールドを除外してコピー
    let common: { [key: string]: any } = {};
    for (const key in items[0]) {
        if (!isValueKey(key)) {
            common[key] = items[0][key];
        }
    }

    // 他のアイテムと比較して共通部分のみ残す
    for (let i = 1; i < items.length; i++) {
        const newCommon: { [key: string]: any } = {};

        for (const key in common) {
            if (key in items[i] && common[key] === items[i][key]) {
                newCommon[key] = common[key];
            }
        }

        common = newCommon;
    }

    return common;
}

/**
 * メタデータを除いた残りのプロパティを抽出
 */
function extractVaryingProperties(
    item: AtTrimmedValue,
    metadata: { [key: string]: any }
): { [key: string]: any } {
    const varying: { [key: string]: any } = {};

    for (const key in item) {
        if (!(key in metadata)) {
            varying[key] = item[key];
        }
    }

    return varying;
}

/**
 * グループを作成
 */
function createGroup(items: AtTrimmedValue[]): OptimizedGroup {
    const metadata = findCommonInArray(items);
    const values = items.map(item => extractVaryingProperties(item, metadata));

    return { metadata, values };
}

/**
 * 共通要素が多い順に最適化されたグループ化を実行（"$"を値として扱う）
 */
export function optimizeGroupingByCommonElements(data: AtTrimmedValue[]): GroupingResult {
    if (data.length === 0) {
        return {
            groups: [],
            totalOriginalSize: 0,
            totalCompressedSize: 0,
            compressionRatio: 0
        };
    }

    const totalOriginalSize = calculateSize(data);
    const remaining = [...data];
    const groups: OptimizedGroup[] = [];

    while (remaining.length > 0) {
        if (remaining.length === 1) {
            // 残り1つの場合：値フィールドとメタデータを分離
            const item = remaining[0];
            const metadata: { [key: string]: any } = {};
            const values: { [key: string]: any } = {};

            for (const key in item) {
                if (isValueKey(key)) {
                    values[key] = item[key];
                } else {
                    metadata[key] = item[key];
                }
            }

            groups.push({ metadata, values: [values] });
            break;
        }

        // 最も共通プロパティが多いペアを見つける
        let maxCommonCount = -1;
        let bestCommonProps: { [key: string]: any } = {};
        const pivot = remaining[0];

        for (let i = 1; i < remaining.length; i++) {
            const commonProps = findCommonProperties(pivot, remaining[i]);
            const commonCount = Object.keys(commonProps).length;

            if (commonCount > maxCommonCount) {
                maxCommonCount = commonCount;
                bestCommonProps = commonProps;
            }
        }

        // 共通プロパティが見つからない場合は単独でグループ化
        if (maxCommonCount === 0) {
            const item = pivot;
            const metadata: { [key: string]: any } = {};
            const values: { [key: string]: any } = {};

            for (const key in item) {
                if (isValueKey(key)) {
                    values[key] = item[key];
                } else {
                    metadata[key] = item[key];
                }
            }

            groups.push({ metadata, values: [values] });
            remaining.shift();
            continue;
        }

        // ベストな共通プロパティを持つすべてのアイテムを収集
        const groupItems: AtTrimmedValue[] = [];
        const nextRemaining: AtTrimmedValue[] = [];

        for (const item of remaining) {
            const hasAllCommonProps = Object.entries(bestCommonProps).every(
                ([key, value]) => item[key] === value
            );

            if (hasAllCommonProps) {
                groupItems.push(item);
            } else {
                nextRemaining.push(item);
            }
        }

        // グループを作成
        groups.push(createGroup(groupItems));

        // 処理済みアイテムを削除
        remaining.splice(0, remaining.length, ...nextRemaining);
    }

    // 共通プロパティ数の多い順にソート
    groups.sort((a, b) => {
        return Object.keys(b.metadata).length - Object.keys(a.metadata).length;
    });

    const totalCompressedSize = calculateSize({ groups });
    const compressionRatio = totalOriginalSize > 0
        ? (totalOriginalSize - totalCompressedSize) / totalOriginalSize
        : 0;

    return {
        groups,
        totalOriginalSize,
        totalCompressedSize,
        compressionRatio
    };
}
