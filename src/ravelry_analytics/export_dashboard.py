"""Export safe synthetic metric slices and a separately ignored real-data payload."""
import argparse
import json
from pathlib import Path
from urllib.parse import quote

import duckdb
import pandas as pd

AS_OF = pd.Timestamp('2026-10-26')
ROOT = Path(__file__).resolve().parents[2]


def activation_retention(con):
    rows = con.execute("""select a.activated_14d, count(*) as n, count_if(a.returned_week4) as returned
        from mart_activation_retention a join selected_users u using (user_id)
        where a.eligible_week4 group by 1""").fetchall()
    grouped = {bool(active): (int(n), int(returned or 0)) for active,n,returned in rows}
    groups=[]
    for active,label in [(True,'Started within 14 days'),(False,'No start within 14 days')]:
        n,returned=grouped.get(active,(0,0))
        groups.append({'activated':active,'label':label,'denominator':n,'numerator':returned,
                       'rate':returned/n if n else None})
    strata_rows=con.execute("""select a.craft,a.experience,a.activated_14d,count(*) as n,
        count_if(a.returned_week4) as returned
        from mart_activation_retention a join selected_users u using (user_id)
        where a.eligible_week4 group by 1,2,3 order by 1,2,3""").fetchall()
    strata={}
    for craft,experience,active,n,returned in strata_rows:
        strata.setdefault((craft,experience),{})[bool(active)]=(int(n),int(returned or 0))
    common=[(key,value) for key,value in strata.items() if all(flag in value for flag in [True,False])]
    covered=sum(sum(n for n,_ in values.values()) for _,values in common)
    rates={True:0.,False:0.}
    if covered:
        for _,values in common:
            weight=sum(n for n,_ in values.values())/covered
            for active in [True,False]:
                n,returned=values[active];rates[active]+=weight*returned/n
    total=sum(g['denominator'] for g in groups)
    crude=groups[0]['rate']-groups[1]['rate'] if all(g['rate'] is not None for g in groups) else None
    return {'groups':groups,'crude_gap':crude,
            'standardised_gap':rates[True]-rates[False] if covered else None,
            'standardised_rates':{'started':rates[True] if covered else None,'not_started':rates[False] if covered else None},
            'common_support_accounts':covered,'eligible_accounts':total,
            'coverage':covered/total if total else None,'common_strata':len(common),'all_strata':len(strata),
            'method':'Direct standardisation to pooled craft × experience weights in strata containing both activation groups. Day-14 landmark precedes week 4. Association only; latent intent remains unobserved.'}


def make_slice(con, craft='All crafts', experience='All experience', window='all'):
    clauses, params = [], []
    if craft != 'All crafts':
        clauses.append('craft = ?'); params.append(craft)
    if experience != 'All experience':
        clauses.append('experience = ?'); params.append(experience)
    threshold = pd.Timestamp('2026-07-06') if window == 'all' else AS_OF - pd.Timedelta(weeks=int(window))
    clauses.append('cohort_week >= ?::date'); params.append(threshold.date())
    where = ' and '.join(clauses)
    con.execute('create or replace temp table selected_users as select * from dim_discovery_users where ' + where, params)
    columns = ['entrants', 'mature', 'opened', 'saved', 'started', 'saved_then_started', 'median_days']
    row = con.execute('''select count(*), count_if(mature_14d),
        count_if(mature_14d and opened_14d), count_if(mature_14d and saved_14d),
        count_if(mature_14d and started_14d),
        count_if(mature_14d and started_14d and first_save_at <= first_start_at),
        median(days_to_start) filter (where mature_14d and started_14d)
        from selected_users''').fetchone()
    summary = dict(zip(columns, [int(v or 0) if i < 6 else (float(v) if v is not None else None)
                                for i, v in enumerate(row)]))
    summary['activation_rate'] = summary['started'] / summary['mature'] if summary['mature'] else None
    summary['immature'] = summary['entrants'] - summary['mature']
    cohorts = con.execute('select cohort_week, count(*) as n from selected_users group by 1 order by 1').fetchall()
    retained = con.execute('''select u.cohort_week, w.weeks_since_discovery, count(*)
        from selected_users u join fct_discovery_weeks w using (user_id)
        where w.weeks_since_discovery between 0 and 8 group by 1, 2''').fetchall()
    count_map = {(str(c), int(w)): int(n) for c, w, n in retained}
    heatmap = []
    eligible4 = retained4 = 0
    for cohort, size in cohorts:
        cells = []
        for week in range(9):
            mature = pd.Timestamp(cohort) + pd.Timedelta(weeks=week + 1) <= AS_OF
            value = count_map.get((str(cohort), week), 0) if mature else None
            cells.append({'week': week, 'numerator': value, 'denominator': int(size),
                          'rate': value / size if value is not None else None, 'mature': mature})
        if cells[4]['mature']:
            eligible4 += int(size); retained4 += int(cells[4]['numerator'])
        heatmap.append({'cohort': str(cohort), 'users': int(size), 'cells': cells})
    summary.update(retention4=retained4 / eligible4 if eligible4 else None,
                   retention4_n=retained4, retention4_eligible=eligible4)
    weeks = con.execute('''select w.activity_week, count(*) as active,
        count(*) filter (where w.weeks_since_discovery = 0) as new
        from fct_discovery_weeks w join selected_users u using (user_id)
        group by 1 order by 1''').fetchall()
    recorded = dict(con.execute('''select date_trunc('week', timezone('UTC', e.occurred_at))::date, count(distinct e.user_id)
        from fct_product_events e join selected_users u using (user_id)
        where e.event_name = 'project_started' group by 1''').fetchall())
    series = [{'week': str(w), 'active': int(a), 'new': int(n),
               'recording_users': int(recorded.get(w, 0))} for w, a, n in weeks]
    segments = con.execute('''select craft, count(*) as entrants, count_if(mature_14d) as mature,
        count_if(mature_14d and started_14d) as starts
        from selected_users group by 1 order by 1''').fetchall()
    return {'summary': summary, 'weekly': series, 'cohorts': heatmap,
            'activation_retention': activation_retention(con),
            'craft_segments': [{'craft': c, 'entrants': int(n), 'mature': int(m or 0),
                                'starts': int(s or 0)} for c, n, m, s in segments]}


def decision_scenarios(slices):
    target = slices['All crafts|New to craft|all']['summary']
    return {'synthetic':True,'target':'New-to-craft discovery accounts',
            'eligible_accounts':target['mature'],'baseline_rate':target['activation_rate'],
            'scenarios':[{'coverage':coverage,'absolute_lift':lift,
                          'additional_recorded_starts':target['mature']*coverage*lift}
                         for coverage in [.5,.75,1.] for lift in [.005,.01,.015,.02]],
            'note':'Assumption-based sensitivity, not a forecast or confidence interval. Fixed cohort size is from the synthetic demo, not expected future traffic.'}


def export_catalogue(path, out):
    if not path.exists():
        return False
    con = duckdb.connect(str(path), read_only=True)
    rows = con.execute('''select craft, projects_count, favourites_count, rating_count,
        difficulty_count, age_days, designer_id from pattern_discovery order by pattern_id''').fetchall()
    provenance = con.execute('select extracted_at from collection_runs order by extracted_at desc limit 1').fetchone()
    # Anonymous within-sample designer grouping supports concentration without exporting source IDs.
    aliases = {}
    records = []
    for craft, projects, favourites, ratings, difficulty, age, designer in rows:
        aliases.setdefault(designer, f'designer-{len(aliases) + 1}')
        records.append({'craft': craft, 'projects': projects, 'favourites': favourites,
                        'rating_count': ratings, 'difficulty_count': difficulty,
                        'age_days': age, 'designer': aliases[designer]})
    con.close()
    payload = {'real_api': True, 'private_local_only': True, 'query': 'cowl',
               'extracted_at': provenance[0].isoformat(), 'records': records,
               'sampling': 'First 50 returned text-search results. Unspecified order; convenience sample.'}
    (out / 'catalogue.private.json').write_text(json.dumps(payload, separators=(',', ':'), allow_nan=False))
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', default='data/product_demo.duckdb')
    parser.add_argument('--out', default='dashboard')
    args = parser.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(args.db, read_only=False)
    con.execute("set TimeZone='UTC'")
    meta = json.loads(con.execute('select assumptions from demo_metadata').fetchone()[0])
    counts = con.execute('select (select count(*) from synthetic_events), (select count(*) from fct_product_events)').fetchone()
    meta['received_events'], meta['unique_events'] = counts
    slices = {}
    for craft in ['All crafts', 'Knitting', 'Crochet']:
        for experience in ['All experience', 'New to craft', 'Experienced']:
            for window in ['all', '8', '4']:
                slices[f'{craft}|{experience}|{window}'] = make_slice(con, craft, experience, window)
    con.close()
    experiment = json.loads(Path('reports/synthetic/results.json').read_text())
    attention = json.loads(Path('reports/synthetic/attention_results.json').read_text())
    payload = {'meta': meta, 'slices': slices, 'experiment': experiment, 'attention': attention, 'decision': decision_scenarios(slices),
               'sql': {name: (ROOT / 'dbt_product/models' / name).read_text()
                       for name in ['fct_product_events.sql', 'dim_discovery_users.sql', 'fct_discovery_weeks.sql', 'mart_activation_retention.sql']}}
    (out / 'data.json').write_text(json.dumps(payload, separators=(',', ':'), allow_nan=False))
    has_real = export_catalogue(Path('data/ravelry.duckdb'), out)
    # The portable deliverable is local-only and can be opened without a server.
    standalone = Path('reports/private/product-metrics.html')
    standalone.parent.mkdir(parents=True, exist_ok=True)
    real_payload = json.loads((out / 'catalogue.private.json').read_text()) if has_real else None
    boot = 'window.PRODUCT_DEMO_DATA=' + json.dumps(payload, allow_nan=False).replace('<', '\\u003c') + ';'
    boot += 'window.PRODUCT_CATALOGUE_DATA=' + json.dumps(real_payload, allow_nan=False).replace('<', '\\u003c') + ';'
    html = (out / 'index.html').read_text()
    css = (out / 'styles.css').read_text()
    for asset in ['stitches.svg', 'needle.svg']:
        if (out / asset).exists():
            css = css.replace(f"url('{asset}')", 'url("data:image/svg+xml,' + quote((out / asset).read_text(), safe='') + '")')
    html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + css + '</style>')
    html = html.replace('<script src="app.js" defer></script>', '<script>' + boot + '</script><script>' + (out / 'app.js').read_text() + '</script>')
    standalone.write_text(html)
    print(f'Exported 27 SYNTHETIC metric slices. Private catalogue payload: {"available locally, ignored by Git" if has_real else "not available"}.')


if __name__ == '__main__':
    main()
