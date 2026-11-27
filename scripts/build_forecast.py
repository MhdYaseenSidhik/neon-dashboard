"""Builds public/data/forecast_holdout.json and forecast.json from the two Context Flow downloads
(raw4/holdout.csv = forecast-evaluation, raw4/forecast.csv = create_forecast asset) and updates manifest.json.
Run from the repo root:  python3 scripts/build_forecast.py <raw_dir>
"""
import json, os, sys
import pandas as pd

RAW = sys.argv[1] if len(sys.argv) > 1 else '../raw4'
D = 'public/data'
P = 'HZL_DEMO_01'
MAXB = 15 * 1024 * 1024
EXP = dict(id='6b098be1984d26076b4cfdf2', createdAt='2026-11-27T13:55:45.984Z',
           assetId='6b098bd942acd4da4449599b', syncId='ff8eb5c2-107b-413c-9e1c-0303d516b542',
           forecastAssetId='6b098c8e984d26076b4cfdfa', forecastCreatedAt='2026-11-27T13:58:38.985Z')

mats = {m['materialId']: m for m in json.load(open(f'{D}/materials.json'))['rows']}
uom_by_group = {g['code']: g['uom'] for g in json.load(open(f'{D}/dims.json'))['materialGroups']}

def attrs(series_id):
    mid = series_id.split('|')[0]
    m = mats[mid]
    return dict(materialId=mid, plantId=series_id.split('|')[1], materialGroup=m['materialGroup'],
                materialType=m['materialType'], uom=uom_by_group[m['materialGroup']])

def r(x, n=4):
    return None if pd.isna(x) else round(float(x), n)

def dump(obj, name):
    s = json.dumps(obj, separators=(',', ':'))
    open(f'{D}/{name}', 'w').write(s)
    return len(s.encode())

# ---------------- backtest ----------------
h = pd.read_csv(f'{RAW}/holdout.csv')
h['month'] = h['timestamp'].str[:7]
assert h['month'].min() == '2025-01' and h['month'].max() == '2025-12' and h.item_id.nunique() == 5948
mae = float(h.absolute_error.mean()); wape = float(h.absolute_error.sum() / h.actual.abs().sum())
act_tot = float(h.actual.sum()); pred_tot = float(h.predicted.sum())
rmse = float((h.squared_error.mean()) ** 0.5)
info = {s: attrs(s) for s in h.item_id.unique()}
h['uom'] = h.item_id.map(lambda s: info[s]['uom'])
h['plantId'] = P
by_pm = [dict(plantId=P, month=m, actual=r(g.actual.sum(), 2), predicted=r(g.predicted.sum(), 2))
         for m, g in h.groupby('month')]
by_uom = [dict(plantId=P, uom=u, month=m, actual=r(g.actual.sum(), 2), predicted=r(g.predicted.sum(), 2))
          for (u, m), g in h.groupby(['uom', 'month'])]
def hold_rows(df):
    return [dict(seriesId=x.item_id, **info[x.item_id], month=x.month, actual=r(x.actual, 3),
                 predicted=r(x.predicted), lower=r(x.lower), upper=r(x.upper)) for x in df.itertuples()]
rows = hold_rows(h)
hold_note = ('Backtest: predictions for the last 12 months of history (2025-01 to 2025-12) that the model did not see; '
             'not a forecast of future months. Quantities are in each material\'s own unit (uom); '
             'byPlantMonth adds across units, so use byUomMonth for unit-safe totals.')
cap = None
obj = dict(kind='backtest', note=hold_note, experimentId=EXP['id'], predictionLength=12,
           metric=dict(name='RMSE', value=1.540308), error=dict(mae=round(mae, 6), wape=round(wape, 6)),
           leaderboard=[dict(model=m, metric=v) for m, v in [('WeightedEnsemble', 1.540308), ('SeasonalNaive', 1.676462), ('DirectTabular', 1.713544)]],
           byPlantMonth=by_pm, byUomMonth=by_uom, series=rows)
if len(json.dumps(obj, separators=(',', ':')).encode()) > MAXB:
    top = h.groupby('item_id').actual.apply(lambda s: s.abs().sum()).nlargest(2000).index
    obj['series'] = hold_rows(h[h.item_id.isin(top)])
    cap = 2000
    obj['note'] = hold_note + ' series holds the 2,000 series with the largest actual volume (file-size cap); byPlantMonth and byUomMonth cover all 5,948 series.'
size_h = dump(obj, 'forecast_holdout.json')
hold_rows_n = len(obj['series'])

# ---------------- future forecast ----------------
f = pd.read_csv(f'{RAW}/forecast.csv')
f['month'] = f['month_start'].str[:7]
assert f.month.min() == '2026-01' and f.month.max() == '2026-12' and f.month.nunique() == 12 and f.series_id.nunique() == 5948
assert len(f) == 5948 * 12
mi = {m: i + 1 for i, m in enumerate(sorted(f.month.unique()))}
f['horizon'] = f.month.map(mi)
f['uom'] = f.series_id.map(lambda s: attrs(s)['uom'])
fc = 'net_consumption_qty_forecast'
f_by_pm = [dict(plantId=P, month=m, horizon=mi[m], predicted=r(g[fc].sum(), 2)) for m, g in f.groupby('month')]
f_by_uom = [dict(plantId=P, uom=u, month=m, horizon=mi[m], predicted=r(g[fc].sum(), 2)) for (u, m), g in f.groupby(['uom', 'month'])]
fc_total = float(f[fc].sum())
cols = list(f.columns)
assert cols[3] == '0.1' and cols[11] == '0.9'
f2 = f.rename(columns={'0.1': 'q10', '0.9': 'q90'})
def fc_rows(df):
    return [dict(seriesId=x.series_id, **attrs(x.series_id), month=x.month, horizon=int(x.horizon),
                 predicted=r(getattr(x, fc)), lower=r(x.q10), upper=r(x.q90)) for x in df.itertuples()]
fnote = ('Forecast of monthly net consumption quantity (movement 261 minus 262) for 2026-01 to 2026-12, from Context Flow experiment '
         + EXP['id'] + '. predicted is the mean; lower/upper are the 0.1 and 0.9 quantiles. Values are not clipped (a small negative value means net reversals are expected). '
         'Quantities are in each material\'s own unit (uom); byPlantMonth adds across units, so use byUomMonth for unit-safe totals. Simulated POC figure.')
fobj = dict(available=True, reason=None, kind='forecast', experimentId=EXP['id'], assetId=EXP['forecastAssetId'], predictionLength=12,
            forecastFrom='2026-01', forecastTo='2026-12', horizons=[3, 6, 12], note=fnote,
            byPlantMonth=f_by_pm, byUomMonth=f_by_uom, rows=fc_rows(f2))
fcap = None
if len(json.dumps(fobj, separators=(',', ':')).encode()) > MAXB:
    top = f.groupby('series_id')[fc].sum().nlargest(2000).index
    fobj['rows'] = fc_rows(f2[f2.series_id.isin(top)])
    fcap = 2000
    fobj['note'] = fnote + ' rows holds the 2,000 series with the largest total predicted (file-size cap); byPlantMonth and byUomMonth cover all 5,948 series.'
size_f = dump(fobj, 'forecast.json')

# ---------------- manifest ----------------
reasons = []
if wape >= 1: reasons.append(f'WAPE {wape:.3f} is 1 or more: no better than predicting zero.')
ratio = pred_tot / act_tot
if ratio < 0.5 or ratio > 2: reasons.append(f'Predicted total {pred_tot:.0f} is {ratio:.2f}x the actual total {act_tot:.0f}.')
reasons += [
    'Backtest WAPE %.3f (MAE %.3f); predicted total %.0f vs actual %.0f (ratio %.3f) on 71,376 held-out rows.' % (wape, mae, pred_tot, act_tot, ratio),
    'Context Flow generalization verdict was not read: the get_experiment response was truncated before the generalization block, so no verdict is claimed from it.',
    'Context Flow reports feature importance 0 for all six covariates: the ensemble relies mainly on the series history.',
    'Intermittent demand: most series have many zero months, so per-series errors are noisy; use group or unit totals for decisions.']
m = json.load(open(f'{D}/manifest.json'))
m['generatedAt'] = '2026-11-27T14:05:00Z'
sql = open('scripts/forecast_training.sql').read().strip()
src = dict(integrationId='6b098812984d26076b4cfd84', syncId=EXP['syncId'], assetId=EXP['assetId'], sql=sql)
m['files'] = [x for x in m['files'] if x['name'] not in ('forecast_holdout.json', 'forecast.json')]
m['files'] += [dict(name='forecast_holdout.json', rows=hold_rows_n, generatedAt='2026-11-27T14:05:00Z', source=dict(src, experimentId=EXP['id'], download='forecast-evaluation')),
               dict(name='forecast.json', rows=len(fobj['rows']), generatedAt='2026-11-27T14:05:00Z', source=dict(src, experimentId=EXP['id'], assetId=EXP['forecastAssetId'], trainingAssetId=EXP['assetId']))]
m['forecast'] = dict(experimentId=EXP['id'], experimentCreatedAt=EXP['createdAt'], problemType='time_series', predictionLength=12,
                     seriesCount=5948, bestModel='WeightedEnsemble', metric=dict(name='RMSE', value=1.540308),
                     backtestError=dict(mae=round(mae, 6), wape=round(wape, 6)), verdict='not read from Context Flow (see verdictReasons)',
                     verdictReasons=reasons, forecastAssetId=EXP['forecastAssetId'], forecastFrom='2026-01', forecastTo='2026-12',
                     trainingRange=dict(from_='2022-01', to='2025-12', months=48, rows=285504),
                     covariateColumns=['material_type', 'planned_maint_qty', 'planned_shutdown_qty', 'plant_shutdown_flag', 'season_index', 'month_of_year'],
                     preset='fast', engine='onprem', backtestPredictedTotal=round(pred_tot, 2), backtestActualTotal=round(act_tot, 2),
                     forecastTotalAllUnits=round(fc_total, 2))
m['forecast']['trainingRange']['from'] = m['forecast']['trainingRange'].pop('from_')
json.dump(m, open(f'{D}/manifest.json', 'w'), indent=1)
print(json.dumps(dict(mae=mae, wape=wape, rmse=rmse, act=act_tot, pred=pred_tot, ratio=ratio, holdRows=hold_rows_n, holdCap=cap, holdBytes=size_h,
                      fcRows=len(fobj['rows']), fcCap=fcap, fcBytes=size_f, fcTotal=fc_total, byUomHold=by_uom[:3])))
