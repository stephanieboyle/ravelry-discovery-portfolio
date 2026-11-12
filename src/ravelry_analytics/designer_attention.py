"""Synthetic designer-exposure sensitivity; account-cluster inference."""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20261113
BOOTSTRAP_SEED = 20261114
HARM_MARGIN = .03
POLICIES = {'neutral': .50, 'concentration_stress': .58}


def generate_attention(users, seed=SEED):
    assigned = users.loc[users.eligible].copy().sort_values('user_id').reset_index(drop=True)
    if assigned.user_id.duplicated().any():
        raise ValueError('Duplicate assignments')
    if not assigned.variant.isin(['control', 'treatment']).all():
        raise ValueError('Invalid variants')
    assigned['assigned_at'] = pd.to_datetime(assigned.assigned_at, utc=True)
    if assigned.assigned_at.isna().any():
        raise ValueError('Missing assignment times')
    rng = np.random.default_rng(seed)
    volumes = np.where(rng.random(len(assigned)) < .90,
                       np.minimum(1 + rng.poisson(8, len(assigned)), 20), 0)
    indexes = np.repeat(np.arange(len(assigned)), volumes)
    size = len(indexes)
    top_uniform = rng.random(size)
    top_designer = rng.integers(1, 11, size)
    tail_designer = rng.integers(11, 101, size)
    timestamps = pd.DatetimeIndex(assigned.assigned_at.iloc[indexes]) + pd.to_timedelta(
        rng.integers(1, 14 * 86400, size), unit='s')
    treatment = assigned.variant.iloc[indexes].to_numpy() == 'treatment'
    preperiod = pd.DataFrame({'designer_id': np.arange(1, 101),
                             'impressions': [900] * 10 + [100] * 90})
    frames = {}
    for name, threshold in POLICIES.items():
        top = top_uniform < np.where(treatment, threshold, .50)
        frames[name] = pd.DataFrame({
            'event_id': [f'a{i:08d}' for i in range(size)],
            'user_id': assigned.user_id.iloc[indexes].to_numpy(),
            'designer_id': np.where(top, top_designer, tail_designer),
            'occurred_at': timestamps,
        })
    return preperiod, frames


def ratio_difference(treatment, control):
    if treatment[:, 1].sum() <= 0 or control[:, 1].sum() <= 0:
        raise ValueError('Both arms require observable impressions')
    return float(treatment[:, 0].sum() / treatment[:, 1].sum()
                 - control[:, 0].sum() / control[:, 1].sum())


def cluster_interval(treatment, control, repetitions=500, seed=BOOTSTRAP_SEED):
    rng = np.random.default_rng(seed)
    draws = []
    for _ in range(repetitions):
        t = treatment[rng.integers(0, len(treatment), len(treatment))]
        c = control[rng.integers(0, len(control), len(control))]
        draws.append(ratio_difference(t, c))
    return [float(v) for v in np.quantile(draws, [.025, .975])]


def analyse_attention(users, impressions, preperiod, repetitions=500):
    assigned = users.loc[users.eligible, ['user_id', 'variant', 'assigned_at']].copy()
    if (assigned.user_id.isna().any() or impressions[['event_id','user_id','designer_id']].isna().any().any()
            or assigned.user_id.duplicated().any() or impressions.event_id.duplicated().any()):
        raise ValueError('Duplicate assignment or impression IDs')
    if not assigned.variant.isin(['control', 'treatment']).all():
        raise ValueError('Invalid variants')
    if (preperiod[['designer_id','impressions']].isna().any().any()
            or preperiod.designer_id.duplicated().any() or preperiod.impressions.lt(0).any()
            or preperiod.impressions.sum() <= 0):
        raise ValueError('Invalid pre-period designer frame')
    if len(preperiod) < 10:
        raise ValueError('Insufficient pre-period designer frame')
    top_count = max(1, int(np.ceil(len(preperiod) * .1)))
    top_ids = set(preperiod.sort_values(['impressions', 'designer_id'], ascending=[False, True]).head(top_count).designer_id)
    if not impressions.designer_id.isin(preperiod.designer_id).all():
        raise ValueError('Unknown designer')
    joined = impressions.merge(assigned, on='user_id', how='left', validate='many_to_one')
    joined['assigned_at'] = pd.to_datetime(joined.assigned_at, utc=True)
    joined['occurred_at'] = pd.to_datetime(joined.occurred_at, utc=True)
    if joined.assigned_at.isna().any() or joined.occurred_at.isna().any():
        raise ValueError('Orphan or invalid impression')
    if ((joined.occurred_at < joined.assigned_at)
            | (joined.occurred_at >= joined.assigned_at + pd.Timedelta(days=14))).any():
        raise ValueError('Impression outside follow-up')
    joined['top'] = joined.designer_id.isin(top_ids)
    account_counts = joined.groupby('user_id').agg(top=('top', 'sum'), total=('top', 'size'))
    all_accounts = assigned.merge(account_counts, on='user_id', how='left', validate='one_to_one')
    all_accounts[['top', 'total']] = all_accounts[['top', 'total']].fillna(0).astype(int)
    t = all_accounts.loc[all_accounts.variant == 'treatment', ['top', 'total']].to_numpy()
    c = all_accounts.loc[all_accounts.variant == 'control', ['top', 'total']].to_numpy()
    if min(len(t), len(c)) == 0:
        raise ValueError('Both arms require assignments')
    difference = ratio_difference(t, c)
    low, high = cluster_interval(t, c, repetitions)
    status = 'within margin' if high < HARM_MARGIN else 'material harm' if low > HARM_MARGIN else 'inconclusive'
    arms = {}
    for name, matrix in [('control', c), ('treatment', t)]:
        counts = joined.loc[joined.variant == name].groupby('designer_id').size().reindex(preperiod.designer_id, fill_value=0)
        shares = counts / counts.sum()
        arms[name] = {'accounts': len(matrix), 'without_impressions': int((matrix[:, 1] == 0).sum()),
                      'impressions': int(matrix[:, 1].sum()), 'top_impressions': int(matrix[:, 0].sum()),
                      'top_share': float(matrix[:, 0].sum() / matrix[:, 1].sum()),
                      'designer_coverage': int((counts > 0).sum()), 'hhi': float((shares ** 2).sum())}
    return {'synthetic': True, 'arms': arms, 'difference': difference,
            'ci_low': low, 'ci_high': high, 'harm_margin': HARM_MARGIN, 'status': status,
            'bootstrap_repetitions': repetitions, 'bootstrap_seed': BOOTSTRAP_SEED,
            'top_designers': top_count, 'designer_universe': len(preperiod),
            'method': 'Impression-weighted ratio; percentile interval resamples assigned account clusters, including zero-exposure accounts.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='data/synthetic')
    parser.add_argument('--out', default='reports/synthetic/attention_results.json')
    args = parser.parse_args()
    source = Path(args.data)
    users = pd.read_csv(source / 'assumed_effect_users.csv')
    preperiod, frames = generate_attention(users)
    preperiod.to_csv(source / 'attention_preperiod.csv', index=False)
    results = {'synthetic': True, 'seed': SEED,
               'assumptions': {'no_exposure_probability': .10, 'control_top_share': .50,
                               'treatment_top_shares': POLICIES, 'harm_margin': HARM_MARGIN,
                               'note': 'New sensitivity analysis; original primary/abandonment criteria are unchanged.'},
               'scenarios': {}}
    for name, frame in frames.items():
        frame.to_csv(source / f'attention_{name}_impressions.csv', index=False)
        results['scenarios'][name] = analyse_attention(users, frame, preperiod)
    target = Path(args.out); target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(results, indent=2, allow_nan=False))
    print('Wrote separate SYNTHETIC designer-attention scenarios and account-cluster intervals.')


if __name__ == '__main__':
    main()
