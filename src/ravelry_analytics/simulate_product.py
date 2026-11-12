"""Generate a separate, explicitly synthetic discovery/retention event stream."""
import argparse
import json
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd

SEED = 20261112
AS_OF = pd.Timestamp('2026-10-26', tz='UTC')
START = pd.Timestamp('2026-07-06', tz='UTC')
ASSUMPTIONS = {
    'synthetic': True, 'seed': SEED, 'users': 12000,
    'starts_at': START.isoformat(), 'as_of_exclusive': AS_OF.isoformat(),
    'discovery_probability': '0.84 + 0.06 × experienced',
    'open_probability': 'clip(0.70 + 0.08 × experienced + 0.06 × latent intent, 0.2, 0.95)',
    'save_probability': 0.43,
    'initial_start_probability': 'clip(0.16 + 0.08 × experienced + 0.10 × saved − 0.025 × crochet + 0.04 × latent intent, 0.02, 0.65)',
    'initial_start_delay_days': 'Uniform from 0.5 to 20; some starts occur after the activation window',
    'return_probability': 'clip(0.43 × exp(−0.16 × week) + 0.13 × intended early starter + 0.05 × experienced + 0.04 × latent intent, 0.02, 0.85)',
    'return_start_probability': 0.10,
    'duplicate_transport_fraction': 0.01,
    'limitations': 'Illustrative assumptions, not calibrated to Ravelry. Telemetry is complete by construction. Retention associations reflect simulated selection and intent, not causality.',
}


def generate(users=12000, seed=SEED):
    rng = np.random.default_rng(seed)
    accounts, events = [], []
    sequence = 0

    def event(uid, name, stamp, session, pattern=None):
        nonlocal sequence
        if stamp >= AS_OF:
            return
        sequence += 1
        events.append({
            'event_id': f'e{sequence:08d}', 'user_id': uid, 'event_name': name,
            'occurred_at': stamp, 'received_at': stamp + pd.Timedelta(seconds=5),
            'session_id': session, 'pattern_id': pattern, 'schema_version': 1,
        })

    for uid in range(users):
        experienced = bool(rng.random() < .45)
        craft = 'Knitting' if rng.random() < .70 else 'Crochet'
        signed_up = START + pd.Timedelta(seconds=int(rng.integers(0, 112 * 86400)))
        accounts.append({'user_id': uid, 'signed_up_at': signed_up, 'craft': craft,
                         'experience': 'Experienced' if experienced else 'New to craft'})
        intent = float(rng.normal())
        if rng.random() >= .84 + .06 * experienced:
            continue
        discovery = signed_up + pd.Timedelta(hours=float(rng.uniform(.1, 72)))
        session = f's{uid}-0'
        event(uid, 'discovery_viewed', discovery, session)
        if discovery >= AS_OF:
            continue
        opened = rng.random() < np.clip(.70 + .08 * experienced + .06 * intent, .2, .95)
        early_start = False
        if opened:
            detail = discovery + pd.Timedelta(seconds=int(rng.integers(20, 1200)))
            pattern = int(rng.integers(1000, 3000))  # Synthetic identifiers only.
            event(uid, 'pattern_opened', detail, session, pattern)
            saved = rng.random() < .43
            if saved:
                event(uid, 'pattern_saved', detail + pd.Timedelta(seconds=30), session, pattern)
            early_start = rng.random() < np.clip(.16 + .08 * experienced + .10 * saved
                                               - .025 * (craft == 'Crochet') + .04 * intent, .02, .65)
            if early_start:
                stamp = detail + pd.Timedelta(days=float(rng.uniform(.5, 20)))
                event(uid, 'project_started', stamp, f's{uid}-start', pattern)
        cohort = discovery.normalize() - pd.Timedelta(days=discovery.weekday())
        for week in range(1, 13):
            probability = np.clip(.43 * np.exp(-.16 * week) + .13 * early_start
                                  + .05 * experienced + .04 * intent, .02, .85)
            if rng.random() >= probability:
                continue
            stamp = cohort + pd.Timedelta(weeks=week, seconds=int(rng.integers(0, 7 * 86400)))
            if stamp >= AS_OF:
                continue
            session = f's{uid}-{week}'
            pattern = int(rng.integers(1000, 3000))
            event(uid, 'discovery_viewed', stamp, session)
            event(uid, 'pattern_opened', stamp + pd.Timedelta(minutes=2), session, pattern)
            if rng.random() < .10:
                event(uid, 'project_started', stamp + pd.Timedelta(minutes=10), session, pattern)
    users_df = pd.DataFrame(accounts)
    events_df = pd.DataFrame(events)
    # Retry copies share the original event_id and are deduplicated by the dbt model.
    duplicates = events_df.sample(frac=.01, random_state=seed).copy()
    duplicates['received_at'] += pd.Timedelta(minutes=1)
    events_df = pd.concat([events_df, duplicates], ignore_index=True)
    return users_df, events_df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', default='data/product_demo.duckdb')
    args = parser.parse_args()
    users, events = generate()
    Path(args.db).parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(args.db)
    con.register('input_users', users)
    con.register('input_events', events)
    con.execute('create or replace table synthetic_users as select * from input_users')
    con.execute('create or replace table synthetic_events as select * from input_events')
    con.execute('create or replace table demo_metadata as select ?::varchar as assumptions',
                [json.dumps(ASSUMPTIONS)])
    con.close()
    print(f'SYNTHETIC: generated {len(users):,} accounts and {len(events):,} received events, including retry copies.')


if __name__ == '__main__':
    main()
