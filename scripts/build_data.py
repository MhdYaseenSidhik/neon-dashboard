"""Build public/data/*.json from Context Flow sync downloads (CSV). Usage: python3 scripts/build_data.py <rawdir>"""
import csv, json, sys, os, datetime, collections
RAW = sys.argv[1]; OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
PLANT = 'HZL_DEMO_01'
GEN = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
ASOF = '2025-12-31'
DISCLAIMER = 'Simulated POC figure. Not actual Vedanta or Hindustan Zinc performance and not a claim of realised savings.'
INT = '6b098812984d26076b4cfd84'
SRC = {
 'kpis': ('fcfb0492-914d-4d45-b01c-19478a24ae44', '6b0988d342acd4da44495996'),
 'inventory_summary': ('c4869a59-681c-4287-8206-5955bbf19772', '6b0989e142acd4da44495997'),
 'materials': ('6ab58c26-244a-41d9-b505-a398dbd45fbe', '6b0989ff42acd4da44495998'),
 'reorder': ('5d879579-62fb-4cf6-b9b7-7b6861d2996f', '6b098a1c42acd4da44495999'),
 'plan_vs_actual': ('c4cb8af6-9d36-4ca3-84cb-285ef285e569', '6b098a6d42acd4da4449599a'),
 'dims': ('(query_preview, no sync: 32 rows <= 100)', None),
}
def rd(n): return list(csv.DictReader(open(os.path.join(RAW, n + '.csv'))))
def num(v):
    if v is None or v == '': return None
    return float(v)
def w(name, obj):
    with open(os.path.join(OUT, name), 'w') as f: json.dump(obj, f, separators=(',', ':'))
    return len(obj['rows']) if 'rows' in obj else None
sql = json.load(open(os.path.join(RAW, 'sql.json')))
uom_of = {}
# dims
dims_rows = json.load(open(os.path.join(RAW, 'dims_rows.json')))
D = collections.defaultdict(list)
for k, code, name, extra, extra2 in dims_rows: D[k].append((code, name, extra, extra2))
for code, name, uom, _ in D['GROUP']: uom_of[code] = uom
dims = {
 'plants': [{'plantId': c, 'name': n, 'type': e, 'region': e2} for c, n, e, e2 in D['PLANT'] if c == PLANT],
 'materialGroups': [{'code': c, 'name': n, 'uom': u} for c, n, u, _ in D['GROUP']],
 'materialTypes': [{'code': c, 'name': n} for c, n, _, _ in D['TYPE']],
 'criticality': [{'code': c, 'name': n, 'serviceLevelPct': float(e)} for c, n, e, _ in D['CRITICALITY']],
 'movementClasses': [c for c, *_ in D['MOVEMENT_CLASS']],
 'inventoryStatuses': [c for c, *_ in D['INVENTORY_STATUS']],
}
assert len(dims['plants']) == 1
counts = {}
with open(os.path.join(OUT, 'dims.json'), 'w') as f: json.dump(dims, f, separators=(',', ':'))
counts['dims.json'] = len(dims['plants']) + len(dims['materialGroups']) + len(dims['materialTypes']) + len(dims['criticality']) + len(dims['movementClasses']) + len(dims['inventoryStatuses'])
# kpis
k = rd('kpis')
UOMS = {}
for r in k: UOMS[r['kpi_code']] = r['kpi_uom']
def direction(c):
    if c in ('INVENTORY_TURNOVER', 'CRITICAL_SPARE_AVAILABILITY_PCT'): return 'higher_is_better'
    for t in ('NON_MOVING', 'SLOW_MOVING', 'OBSOLETE', 'STOCKOUT', 'DAYS_ON_HAND'):
        if t in c: return 'lower_is_better'
    return 'neutral'
DEF = {
 'CONSUMPTION_QTY': 'Net quantity consumed in the month (issues 261 minus reversals 262), summed across material groups of different units; use per-group quantities for unit-safe totals.',
 'GROSS_INVENTORY_QTY': 'Gross stock quantity at month end, summed across material groups of different units; not unit-safe.',
 'CONSUMPTION_VALUE_INR': 'Value of net consumption in the month, in INR.',
 'GROSS_INVENTORY_VALUE_INR': 'Gross inventory value at month end, in INR.',
 'UNRESTRICTED_INVENTORY_VALUE_INR': 'Value of unrestricted-use stock at month end, in INR.',
 'MAINTENANCE_CONSUMPTION_VALUE_INR': 'Consumption value booked to maintenance, in INR.',
 'SHUTDOWN_CONSUMPTION_VALUE_INR': 'Consumption value booked to planned shutdowns, in INR.',
 'RECEIPT_VALUE_INR': 'Value of goods receipts in the month, in INR.',
 'ON_ORDER_VALUE_INR': 'Value of open purchase orders at month end, in INR.',
 'STOCK_LINES': 'Number of material stock lines held at month end.',
 'PR_COUNT': 'Number of purchase requisitions raised in the month.',
 'ACTIVE_VALUE_INR': 'Inventory value of actively moving materials, in INR.',
 'AVG_INVENTORY_VALUE_12M_INR': 'Average inventory value over the trailing 12 months, in INR.',
 'CRITICAL_SPARE_AVAILABILITY_PCT': 'Share of critical spare lines with demand that are available, in percent.',
 'DAYS_ON_HAND': 'Inventory value divided by average daily consumption value, in days.',
 'INVENTORY_TURNOVER': 'Trailing 12-month consumption value divided by average inventory value.',
 'NON_MOVING_SHARE_PCT': 'Non-moving value as a share of inventory value, in percent.',
 'NON_MOVING_VALUE_INR': 'Inventory value of non-moving materials, in INR.',
 'OBSOLETE_SHARE_PCT': 'Obsolete value as a share of inventory value, in percent.',
 'OBSOLETE_VALUE_INR': 'Inventory value of obsolete materials, in INR.',
 'SLOW_MOVING_SHARE_PCT': 'Slow-moving value as a share of inventory value, in percent.',
 'SLOW_MOVING_VALUE_INR': 'Inventory value of slow-moving materials, in INR.',
 'STOCKOUT_LINES': 'Number of stock lines at zero available quantity with demand.',
 'T12M_CONSUMPTION_VALUE_INR': 'Consumption value over the trailing 12 months, in INR.',
 'VITAL_LINES_WITH_DEMAND': 'Number of vital-criticality lines with demand in the trailing 12 months.',
}
cat = [{'code': c, 'label': c.replace('_INR', ' (INR)').replace('_QTY', ' (qty)').replace('_PCT', ' (%)').replace('_', ' ').replace(' (INR)', ' (INR)').title().replace('Inr', 'INR').replace('Qty', 'qty').replace('Pct', '%').replace('T12M', '12M'),
        'uom': u, 'direction': direction(c), 'definition': DEF.get(c, c)} for c, u in sorted(UOMS.items())]
for c in cat:
    c['label'] = c['label'].replace('  ', ' ')
rows = [{'month': r['month'], 'plantId': r['plant_id'], 'kpiCode': r['kpi_code'], 'value': num(r['kpi_value']), 'uom': r['kpi_uom'], 'scenario': r['scenario']} for r in k]
assert all(r['plantId'] == PLANT for r in rows)
w('kpis.json', {'catalog': cat, 'rows': rows}); counts['kpis.json'] = len(rows)
# inventory_summary
r = rd('inv_summary')
rows = [{'plantId': x['plant_id'], 'materialGroup': x['material_group'], 'materialType': x['material_type'], 'uom': x['uom'], 'criticality': x['criticality'], 'movementClass': x['movement_class'], 'inventoryStatus': x['inventory_status'], 'abcClass': x['abc_class'], 'materials': int(x['materials']), 'availableQty': num(x['available_qty']), 'valueInr': num(x['value_inr'])} for x in r]
w('inventory_summary.json', {'asOf': ASOF, 'rows': rows}); counts['inventory_summary.json'] = len(rows)
# materials
r = rd('materials')
rows = [{'materialId': x['material_id'], 'plantId': x['plant_id'], 'description': x['description'], 'materialGroup': x['material_group'], 'materialType': x['material_type'], 'uom': x['uom'], 'criticality': x['criticality'], 'abcClass': x['abc_class'], 'xyzClass': x['xyz_class'], 'movementClass': x['movement_class'], 'inventoryStatus': x['inventory_status'], 'availableQty': num(x['available_qty']), 'valueInr': num(x['value_inr']), 'daysOnHand': num(x['days_on_hand']), 'daysSinceLastConsumption': num(x['days_since_last_consumption']), 'safetyStockQty': num(x['safety_stock_qty']), 'reorderPointQty': num(x['reorder_point_qty']), 'maxStockQty': num(x['max_stock_qty']), 'trailing12mDemandQty': num(x['trailing_12m_demand_qty'])} for x in r]
assert len({(x['materialId'], x['plantId']) for x in rows}) == len(rows), 'materials not unique per material x plant'
w('materials.json', {'asOf': ASOF, 'rows': rows}); counts['materials.json'] = len(rows)
# reorder
r = rd('reorder')
rows = [{'recommendationId': x['recommendation_id'], 'materialId': x['material_id'], 'plantId': x['plant_id'], 'materialGroup': x['material_group'], 'materialType': x['material_type'], 'uom': x['uom'], 'criticality': x['criticality'], 'priority': x['priority'], 'recommendedPrDate': x['recommended_pr_date'] or None, 'recommendedQty': num(x['recommended_qty']), 'estimatedValueInr': num(x['estimated_value_inr']), 'availableQty': num(x['available_qty']), 'openPrQty': num(x['open_pr_qty']), 'openPoQty': num(x['open_po_qty']), 'safetyStockQty': num(x['safety_stock_qty']), 'reorderPointQty': num(x['reorder_point_qty']), 'reason': x['reason'], 'shutdownId': x['shutdown_id'] or None} for x in r]
w('reorder.json', {'asOf': ASOF, 'rows': rows}); counts['reorder.json'] = len(rows)
# plan vs actual
r = rd('plan_vs_actual')
rows = [{'month': x['month'], 'plantId': x['plant_id'], 'materialGroup': x['material_group'], 'materialType': x['material_type'], 'uom': x['uom'], 'shutdownDriven': x['shutdown_driven'] == 'Y', 'planValueInr': num(x['plan_value_inr']), 'actualPoValueInr': num(x['actual_po_value_inr']), 'actualGrValueInr': num(x['actual_gr_value_inr']), 'varianceInr': num(x['variance_inr']), 'variancePct': num(x['variance_pct'])} for x in r]
w('plan_vs_actual.json', {'rows': rows}); counts['plan_vs_actual.json'] = len(rows)
# manifest
files = []
for n in ['dims', 'kpis', 'inventory_summary', 'materials', 'reorder', 'plan_vs_actual']:
    sy, asset = SRC[n]
    files.append({'name': n + '.json', 'rows': counts[n + '.json'], 'generatedAt': GEN, 'source': {'integrationId': INT, 'syncId': sy, 'assetId': asset, 'sql': sql[n]}})
manifest = {'schemaVersion': 3, 'generatedAt': GEN, 'asOf': ASOF, 'plantId': PLANT, 'plantName': dims['plants'][0]['name'],
  'materialTypes': ['ZSPR', 'ZSPN'], 'source': 'neon:neondb via Context Flow (integration %s)' % INT,
  'disclaimer': DISCLAIMER, 'backcastIncluded': False,
  'backcastNote': 'No rows with is_backcast_period = Y exist in fact_material_movement_part_001..003, fact_inventory_snapshot_part_001..004, fact_purchase_order, fact_purchase_requisition or fact_goods_receipt (all counted 0 in this run). No backcast rows are included.',
  'files': files, 'forecast': None}
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print(counts)
