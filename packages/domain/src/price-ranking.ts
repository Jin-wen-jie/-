import { Decimal } from "decimal.js";
import type { PriceInput, PriceRow } from "./types.js";

export function rankPrices(rows: PriceInput[], targetQty: number): PriceRow[] {
  const enriched: PriceRow[] = rows.map((row) => {
    const bundleQty = new Decimal(row.bundleQty);
    const targetQtyDec = new Decimal(targetQty);
    const minBundleCount = new Decimal(row.minBundleCount);

    const bundlesNeededForTarget = targetQtyDec.div(bundleQty).ceil();
    const requiredBundles = Decimal.max(bundlesNeededForTarget, minBundleCount);
    const actualQty = requiredBundles.mul(bundleQty);
    const packagePriceCny = new Decimal(row.packagePriceCny);
    const totalCny = packagePriceCny.mul(requiredBundles);
    const unitCny = totalCny.div(actualQty);

    return {
      id: row.id,
      packagePriceCny: row.packagePriceCny,
      bundleQty: row.bundleQty,
      minBundleCount: row.minBundleCount,
      requiredBundles: requiredBundles.toNumber(),
      actualQty: actualQty.toNumber(),
      totalCny: totalCny.toFixed(2),
      unitCny: unitCny.toFixed(2),
    };
  });

  // Sort by unit price ascending, then by id for deterministic tie-breaking
  enriched.sort((a, b) => {
    const unitA = new Decimal(a.unitCny);
    const unitB = new Decimal(b.unitCny);
    if (!unitA.eq(unitB)) return unitA.lt(unitB) ? -1 : 1;
    // Same price: sort by id
    return a.id.localeCompare(b.id);
  });

  return enriched;
}
