"""Private snapshot diagnostics; no causal or catalogue-wide inference."""
import argparse
import json
import math
from pathlib import Path
import duckdb
import numpy as np
import pandas as pd
import os
os.environ.setdefault("MPLCONFIGDIR", str(Path(".cache/matplotlib").resolve()))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

COLOURS=["#376b69", "#be7354", "#839b7a", "#d3b77d"]

def top_share(values, fraction=.1):
    x=np.sort(np.asarray(values,dtype=float))[::-1]
    if not len(x) or x.sum()==0: return None
    return float(x[:max(1,math.ceil(len(x)*fraction))].sum()/x.sum())

def lorenz(values):
    x=np.sort(np.asarray(values,dtype=float))
    if not len(x) or x.sum()==0: return None,None
    return np.linspace(0,1,len(x)+1),np.r_[0,np.cumsum(x)/x.sum()]

def main():
    p=argparse.ArgumentParser();p.add_argument("--db",default="data/ravelry.duckdb");p.add_argument("--out",default="reports/private");a=p.parse_args()
    out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
    con=duckdb.connect(a.db,read_only=True)
    df=con.execute("select * from pattern_discovery order by pattern_id").df()
    provenance=con.execute("select extracted_at,provenance from collection_runs order by extracted_at desc limit 1").fetchone()
    categories=con.execute("select category_name,count(distinct pattern_id) as patterns from bridge_pattern_categories group by 1 order by 2 desc").df()
    if df.empty: raise ValueError("No current patterns")
    designers=df.groupby("designer_id",dropna=False).projects_count.sum(min_count=1)
    known_age=df[df.age_days.notna() & (df.age_days>=0)]
    metrics={"private_real_api_snapshot":True,"patterns":len(df),"designers":len(designers),
        "extracted_at":provenance[0].isoformat(),"provenance":json.loads(provenance[1]),
        "recorded_projects_total":int(df.projects_count.sum()),"favourites_total":int(df.favourites_count.sum()),
        "zero_project_patterns":int(df.projects_count.eq(0).sum()),
        "pattern_top_decile_project_share":top_share(df.projects_count),
        "designer_top_decile_project_share":top_share(designers),
        "rating_count_unknown":int(df.rating_count.isna().sum()),
        "difficulty_count_unknown":int(df.difficulty_count.isna().sum()),
        "positive_rating_count_patterns":int(df.rating_count.gt(0).sum()),
        "at_least_10_rating_patterns":int(df.rating_count.ge(10).sum()),
        "age_known_nonnegative":len(known_age),"future_publication_dates":int(df.age_days.lt(0).sum()),
        "median_age_days":float(known_age.age_days.median()) if len(known_age) else None,
        "craft_counts":{str(k):int(v) for k,v in df.craft.value_counts(dropna=False).items()},
        "eligible_quality_review_at_counts":{str(k):int((df.rating_count.ge(k)&df.difficulty_count.ge(k)).sum()) for k in [5,10,20]}}
    (out/'metrics.json').write_text(json.dumps(metrics,indent=2,allow_nan=False))
    df.to_csv(out/'pattern_discovery.csv',index=False)
    categories.to_csv(out/'category_counts.csv',index=False)
    # 1: Cumulative shares, both explicitly conditional on collected records.
    fig,ax=plt.subplots(figsize=(8,4.5))
    for values,label,col in [(df.projects_count,"Patterns in sample",COLOURS[0]),(designers,"Observed designers",COLOURS[1])]:
        x,y=lorenz(values)
        if x is not None: ax.plot(x,y,label=label,color=col,linewidth=2)
    ax.plot([0,1],[0,1],linestyle=':',color='#999999',label='Equal share')
    ax.set(xlabel='Cumulative share of sample entities, ordered by recorded projects',ylabel='Cumulative share of recorded projects',title='PRIVATE REAL API · Activity is uneven within this sample')
    ax.legend(frameon=False);fig.tight_layout();fig.savefig(out/'activity_concentration.png',dpi=160);plt.close(fig)
    # 2: All missing states remain distinct, including unknown versus zero counts.
    labels=['Unknown count','Zero count','1–9 ratings','10+ ratings']
    vals=[df.rating_count.isna().sum(),df.rating_count.eq(0).sum(),df.rating_count.between(1,9).sum(),df.rating_count.ge(10).sum()]
    fig,ax=plt.subplots(figsize=(8,4.2));bars=ax.barh(labels,vals,color=COLOURS)
    ax.bar_label(bars,fmt='%d',padding=4);ax.set_xlim(0,max(vals)*1.2+1)
    ax.set(xlabel='Patterns in the collected sample',title='PRIVATE REAL API · How much rating evidence is available?')
    fig.tight_layout();fig.savefig(out/'rating_evidence.png',dpi=160);plt.close(fig)
    # 3: Exposure is unavailable. No project-rate or exposure proxy is created.
    fig,ax=plt.subplots(figsize=(8,4.5))
    for i,(craft,g) in enumerate(known_age.groupby('craft')):
        ax.scatter(g.age_days,g.projects_count,label=craft,alpha=.7,color=COLOURS[i%len(COLOURS)],edgecolor='white',linewidth=.4)
    ax.set_yscale('symlog',linthresh=1)
    ax.set(xlabel='Days since displayed publication date (non-negative only)',ylabel='Recorded project total (symlog scale)',title='PRIVATE REAL API · Pattern age and recorded activity')
    if len(known_age): ax.legend(frameon=False)
    fig.tight_layout();fig.savefig(out/'age_activity.png',dpi=160);plt.close(fig)
    n=len(df);m=metrics
    share=m['pattern_top_decile_project_share']
    lines=['# Private real-data findings','', '**Real Ravelry API data. Private local review only; publication permission unresolved.**','',
      f"Snapshot: {m['extracted_at']}. Query `cowl`, {n} returned patterns and {m['designers']} observed designers. Default search order is unspecified; pagination is not a random sample. Search results can shift during collection. No inclusion probabilities or representative confidence intervals are available.",'',
      '## 1. How is recorded activity distributed?', '',
      f"The sample contains {m['recorded_projects_total']:,} recorded projects across its patterns; {m['zero_project_patterns']} patterns have zero recorded projects. The top {math.ceil(n*.1)} patterns account for {share:.1%} of recorded projects within this sample." if share is not None else 'No recorded projects; concentration is undefined.',
      'Observation: activity totals are uneven within this collected set. Hypothesis: popularity signals could reinforce attention, but the data contain no impressions. Recommendation: instrument designer exposure before testing re-ranking.', '',
      '![Activity concentration](activity_concentration.png)', '',
      '## 2. How does activity relate to age and craft?', '',
      f"Craft composition: {m['craft_counts']}. {m['age_known_nonnegative']}/{n} records have a usable non-negative publication age; median age {m['median_age_days']} days. {m['future_publication_dates']} future dates are excluded from the age plot.",
      'Observation: the plot shows snapshot associations conditional on this search. Publication age is not time on platform, and a displayed date may be approximate. Hypothesis: time available to accumulate activity and search ordering affect apparent popularity. Recommendation: recruit across ages and crafts rather than interpret these counts as demand or a causal age effect.', '',
      '![Age and activity](age_activity.png)', '',
      '## 3. Is the metadata ready for confidence-oriented discovery?', '',
      f"Rating counts are unknown for {m['rating_count_unknown']}/{n} patterns; difficulty counts for {m['difficulty_count_unknown']}/{n}. Only {m['at_least_10_rating_patterns']} have at least ten ratings. Unknown is not zero. Uncounted averages are retained raw but suppressed from the analysis-ready quality fields.",
      'Observation: average values alone cannot establish reliable evidence. Recommendation: show insufficient evidence explicitly and test comprehension; never label an unreviewed pattern unsuitable.', '',
      '![Rating evidence](rating_evidence.png)', '',
      '## 4. Can we identify promising low-activity patterns?', '',
      f"Requiring both rating and difficulty counts of at least 5, 10 and 20 leaves {m['eligible_quality_review_at_counts']} patterns, respectively. These thresholds are sensitivity checks, not validated definitions of quality.",
      'The sample and count limitations do not support an objective opportunity ranking. No score or low-exposure claim is produced. Next: validate rating scales and count semantics, collect a documented broader frame if permitted, and use qualitative review of suitable segments. Category_counts.csv reports distinct pattern membership; categories may overlap, so its rows are not additive.', '',
      '## Decision and limits','',
      'Investigate explainable suitability and uncertainty within existing discovery, rather than launch a popularity/quality ranking. This descriptive snapshot cannot establish unmet user need, impressions, actual making, conversion, treatment effects or network effects. Totals may span different users and periods. No favourites-to-project conversion rate, historical trajectory or causal claim is calculated.', '',
      'Traceability: metrics.json supplies every numerical claim above; pattern_discovery.csv is the model export and category_counts.csv records category coverage. Regenerate all figures from analyse_catalogue.py. Store these files locally only and honour deletion requests.']
    (out/'findings.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({k:v for k,v in metrics.items() if k!='provenance'}))

if __name__=='__main__':main()
