export type Uom = 'EA' | 'SET' | 'L' | string
export type Direction = 'higher_is_better' | 'lower_is_better' | 'neutral'

export interface Dims {
  plants: { plantId: string; name: string; type: string; region: string }[]
  materialGroups: { code: string; name: string; uom: Uom }[]
  materialTypes: { code: string; name: string }[]
  criticality: { code: string; name: string; serviceLevelPct: number }[]
  movementClasses: string[]
  inventoryStatuses: string[]
}
export interface KpiCatalogItem { code: string; label: string; uom: string; direction: Direction; definition: string }
export interface KpiRow { month: string; plantId: string; kpiCode: string; value: number; uom: string; scenario: string }
export interface KpisFile { catalog: KpiCatalogItem[]; rows: KpiRow[] }

export interface SummaryRow {
  plantId: string; materialGroup: string; materialType: string; uom: Uom; criticality: string
  movementClass: string; inventoryStatus: string; abcClass: string
  materials: number; availableQty: number; valueInr: number
}
export interface InventorySummaryFile { asOf: string; rows: SummaryRow[] }

export interface MaterialRow {
  materialId: string; plantId: string; description: string; materialGroup: string; materialType: string; uom: Uom
  criticality: string; abcClass: string; xyzClass: string; movementClass: string; inventoryStatus: string
  availableQty: number; valueInr: number; daysOnHand: number; daysSinceLastConsumption: number
  safetyStockQty: number; reorderPointQty: number; maxStockQty: number; trailing12mDemandQty: number
}
export interface MaterialsFile { asOf: string; rows: MaterialRow[] }

export interface ReorderRow {
  recommendationId: string; materialId: string; plantId: string; materialGroup: string; materialType: string; uom: Uom
  criticality: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' | string; recommendedPrDate: string
  recommendedQty: number; estimatedValueInr: number; availableQty: number; openPrQty: number; openPoQty: number
  safetyStockQty: number; reorderPointQty: number; reason: string; shutdownId: string | null
}
export interface ReorderFile { asOf: string; rows: ReorderRow[] }

export interface PlanRow {
  month: string; plantId: string; materialGroup: string; materialType: string; uom: Uom; shutdownDriven: boolean
  planValueInr: number; actualPoValueInr: number; actualGrValueInr: number; varianceInr: number; variancePct: number | null
}
export interface PlanFile { rows: PlanRow[] }

export interface PlantMonth { plantId: string; month: string; actual?: number; predicted: number; horizon?: number }
export interface UomMonth { plantId: string; uom: Uom; month: string; actual?: number; predicted: number; horizon?: number }
export interface BacktestSeriesRow {
  seriesId: string; materialId: string; plantId: string; materialGroup: string; materialType: string; uom: Uom
  month: string; actual: number; predicted: number; lower: number; upper: number
}
export interface HoldoutFile {
  kind: 'backtest'; note: string; experimentId: string; predictionLength: number
  metric: { name: string; value: number }; error: { mae: number; wape: number }
  leaderboard: { model: string; metric: number }[]
  byPlantMonth: (PlantMonth & { actual: number })[]; byUomMonth: (UomMonth & { actual: number })[]
  series: BacktestSeriesRow[]
}
export interface ForecastRow {
  seriesId: string; materialId: string; plantId: string; materialGroup: string; materialType: string; uom: Uom
  month: string; horizon: number; predicted: number; lower: number; upper: number
}
export interface ForecastFile {
  available: boolean; reason: string | null; kind: 'forecast'; experimentId: string; assetId: string
  predictionLength: number; forecastFrom: string; forecastTo: string; horizons: number[]; note: string
  byPlantMonth: PlantMonth[]; byUomMonth: UomMonth[]; rows: ForecastRow[]
}
export interface Manifest {
  schemaVersion: number; generatedAt: string; asOf: string; plantId: string; plantName: string
  materialTypes: string[]; source: string; disclaimer: string; backcastIncluded: boolean; backcastNote: string
  files: { name: string; rows: number; generatedAt: string }[]
  forecast: null | {
    experimentId: string; experimentCreatedAt: string; predictionLength: number; seriesCount: number; bestModel: string
    metric: { name: string; value: number }; backtestError: { mae: number; wape: number }
    verdict: string; verdictReasons: string[]; forecastFrom: string; forecastTo: string
    trainingRange: { from: string; to: string; months: number; rows: number }
    covariateColumns: string[]; preset: string; engine: string
    backtestPredictedTotal: number; backtestActualTotal: number; forecastTotalAllUnits: number
  }
}

export interface DatasetMap {
  manifest: Manifest; dims: Dims; kpis: KpisFile; inventory_summary: InventorySummaryFile
  materials: MaterialsFile; reorder: ReorderFile; plan_vs_actual: PlanFile
  forecast: ForecastFile; forecast_holdout: HoldoutFile
}
export type DatasetName = keyof DatasetMap
