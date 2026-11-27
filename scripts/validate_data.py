import json,os,sys
D=os.path.join(os.path.dirname(__file__),'..','public','data'); L=lambda n:json.load(open(os.path.join(D,n)))
m=L('manifest.json'); P='HZL_DEMO_01'; ok=True
def chk(c,msg):
    global ok
    print(('PASS ' if c else 'FAIL ')+msg); ok&=bool(c)
d=L('dims.json'); chk([p['plantId'] for p in d['plants']]==[P],'dims lists only HZL_DEMO_01')
chk(all(g.get('uom') for g in d['materialGroups']),'every materialGroup has uom')
uom={g['code']:g['uom'] for g in d['materialGroups']}
for f in m['files']:
    o=L(f['name']); rows=o['rows'] if 'rows' in o else None
    if f['name']=='dims.json': continue
    chk(len(rows)==f['rows'],f"{f['name']} rows {len(rows)} == manifest")
    chk(all(r.get('plantId')==P for r in rows),f"{f['name']} plant filter")
    if f['name']!='kpis.json':
        chk(all(r.get('plantId') for r in rows) and all(r['materialType'] in('ZSPR','ZSPN') for r in rows if 'materialType' in r),f"{f['name']} material type scope")
        if 'uom' in rows[0] or f['name']!='plan_vs_actual.json':
            pass
        chk(all(r.get('uom') and r['uom']==uom[r['materialGroup']] for r in rows),f"{f['name']} uom non-null and equals ref_material_group.base_uom")
k=L('kpis.json'); chk(not any(r['plantId']=='ALL_PLANTS' for r in k['rows']),'kpis has no ALL_PLANTS')
chk({c['code'] for c in k['catalog']}=={r['kpiCode'] for r in k['rows']},'kpi catalog covers every code')
s=L('inventory_summary.json')['rows']; mt=L('materials.json')['rows']
a=sum(r['availableQty'] for r in s); b=sum(r['availableQty'] for r in mt)
chk(abs(a-b)<0.01,f'summary availableQty {a:.3f} == materials {b:.3f}')
chk(sum(r['materials'] for r in s)==len(mt),'summary material count == materials rows')
chk(m['asOf']=='2025-12-31' and m['backcastIncluded'] is False,'asOf data date, backcast false')
print('qty by uom (never mixed):',{u:round(sum(r['availableQty'] for r in mt if r['uom']==u),3) for u in sorted({r['uom'] for r in mt})})
sys.exit(0 if ok else 1)
