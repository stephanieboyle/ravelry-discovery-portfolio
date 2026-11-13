'use strict';
const $ = (selector) => document.querySelector(selector);
const number = (v) => v == null ? '—' : new Intl.NumberFormat('en-GB').format(v);
const percent = (v, places = 1) => v == null ? '—' : `${(v * 100).toFixed(places)}%`;
const points = (v) => v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(2)} pp`;
const dateLabel = (value) => new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const escapeText = (s) => String(s).replace(/[&<>"']/g, (v) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[v]));
let DATA, CATALOGUE = null;
let page = 'overview', scenario = 'assumed_effect', catalogueCraft = 'All crafts';
let attentionScenario = 'neutral', impactCoverage = .75, impactLift = .015;
const defs = {
  active: 'Distinct accounts in the selected discovery cohorts with a discovery view, pattern open, save or recorded start during the latest complete Monday–Sunday week. An account counts once. This is activity among the selected cohorts, not a measure of all Ravelry users.',
  entrants: 'Distinct accounts with a first discovery_viewed event in the selected cohorts. An account is counted once. These are simulated accounts, not Ravelry users.',
  activation: 'Accounts recording a project_started event after a pattern open and within 14 days of first discovery ÷ discovery accounts with a complete 14-day window. Saves are optional. This is recorded behaviour, not proof of actually making something.',
  retention: 'Selected discovery accounts with an event during calendar week 4 after their first-discovery week ÷ accounts in cohorts whose entire week 4 has elapsed. Qualifying events: discovery view, pattern open, save or recorded start.',
  time: 'Median elapsed days from first discovery to first recorded start, among mature accounts that recorded one within 14 days. It excludes non-starters and is not time-to-start for all users.',
};
const pages = {
  overview: ['The discovery-to-start gap', 'Finding a pattern is just the start.', 'Explore where browsing becomes a recorded project start.'],
  funnel: ['Activation', 'Discovery funnel', 'Progression from a first discovery visit to a recorded project start, within 14 days.'],
  retention: ['Retention', 'Discovery retention', 'Weekly return rates by first-discovery cohort, using complete observation windows.'],
  experiment: ['Experiment review', 'Pattern suitability experiment', 'Proposed test: does clearer information about difficulty and materials increase recorded project starts?'],
  decision: ['Product recommendation', 'The next product decision', 'A focused prototype, a measurable test, and explicit assumptions about impact.'],
  catalogue: ['Catalogue health', 'Patterns and designer activity', 'Real catalogue context: recorded project activity, designer concentration and rating coverage.'],
  methods: ['Definitions and methodology', 'Metric definitions', 'Event definitions, denominators, data sources and the SQL behind this report.'],
};
const slice = () => DATA.slices[`${$('#craft').value}|${$('#experience').value}|${$('#window').value}`];
function metric(label, value, context, key = '', accent = false) {
  return `<div class="metric${accent ? ' accent' : ''}"><div class="label">${label}${key ? `<button type="button" data-definition="${key}" aria-label="How ${label.toLowerCase()} is calculated">i</button>` : ''}</div><strong>${value}</strong><div class="context">${context}</div></div>`;
}
function panel(title, subtitle, body, extra = '') {
  return `<section class="panel"><div class="panel-heading"><div><h2>${title}</h2><p class="sub">${subtitle}</p></div>${extra}</div>${body}</section>`;
}
function svg(content, width = 800, height = 240, label = 'Chart') {
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeText(label)}"><title>${escapeText(label)}</title>${content}</svg>`;
}
function lineChart(rows, series, { label = 'Weekly activity', rate = false } = {}) {
  if (!rows.length) return '<p class="sub">No observations in this selection.</p>';
  const W = 800, H = 236, L = 44, R = 15, T = 14, B = 35;
  const max = rate ? Math.max(.5, ...rows.flatMap((r) => series.map((s) => r[s.key] || 0))) : Math.max(1, ...rows.flatMap((r) => series.map((s) => r[s.key] || 0))) * 1.15;
  const x = (i) => L + (i / Math.max(1, rows.length - 1)) * (W - L - R);
  const y = (v) => H - B - (v / max) * (H - T - B);
  let parts = '';
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    parts += `<line class="grid" x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}"/><text x="${L - 9}" y="${y(v) + 4}" text-anchor="end">${rate ? percent(v, 0) : number(Math.round(v))}</text>`;
  }
  rows.forEach((r, i) => {
    if (i === 0 || i === rows.length - 1 || i % Math.max(1, Math.ceil(rows.length / 7)) === 0) {
      const anchor = i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle';
      parts += `<text x="${x(i)}" y="${H - 10}" text-anchor="${anchor}">${r.label || dateLabel(r.week)}</text>`;
    }
  });
  series.forEach((s) => {
    const valid = rows.map((r, i) => ({ v: r[s.key], i })).filter((p) => p.v != null);
    if (!valid.length) return;
    const path = valid.map((p, i) => `${i ? 'L' : 'M'}${x(p.i)},${y(p.v)}`).join(' ');
    if (!s.coral && valid.length > 1) parts += `<path d="${path} L${x(valid.at(-1).i)},${H - B} L${x(valid[0].i)},${H - B} Z" fill="#4d7059" opacity=".055"/>`;
    parts += `<path class="series${s.coral ? ' coral' : ''}" d="${path}"/>`;
    valid.forEach((p) => { parts += `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="3.5" fill="${s.coral ? '#b56f4f' : '#4d7059'}" tabindex="0"><title>${rows[p.i].label || dateLabel(rows[p.i].week)} · ${s.label}: ${rate ? percent(p.v) : number(p.v)}</title></circle>`; });
  });
  return svg(parts, W, H, label);
}
function funnelChart(s) {
  const stages = [
    {name:'Discovery', count:s.mature, color:'#4d7059'},
    {name:'Pattern opened', count:s.opened, color:'#8b9f78'},
    {name:'Start recorded', count:s.started, color:'#b56f4f'},
  ];
  const centre = 302, fullWidth = 302, width = (n) => s.mature ? fullWidth*n/s.mature : 0;
  let content = '';
  stages.forEach((stage,i) => {
    const top = 16+i*80, wt=width(stage.count), wb=width(stages[Math.min(i+1,2)].count);
    const title = `${stage.name}: ${number(stage.count)} accounts; ${percent(s.mature ? stage.count/s.mature : null)} of discovery entrants`;
    content += `<polygon points="${centre-wt/2},${top} ${centre+wt/2},${top} ${centre+wb/2},${top+68} ${centre-wb/2},${top+68}" fill="${stage.color}" tabindex="0"><title>${title}</title></polygon>`;
    content += `<text class="funnel-stage-label" x="8" y="${top+34}">${stage.name}</text><text class="funnel-stage-count" x="606" y="${top+29}" text-anchor="end">${number(stage.count)}</text><text class="funnel-stage-rate" x="606" y="${top+49}" text-anchor="end">${percent(s.mature ? stage.count/s.mature : null)} of entrants</text>`;
  });
  return svg(content,620,252,'Discovery funnel: stage boundary widths show account counts; ordered steps over 14 days');
}
function stackedActivity(rows) {
  if (!rows.length) return '<p class="sub">No activity in this selection.</p>';
  const W=620,H=252,L=42,R=12,T=12,B=36, max=Math.max(500,Math.ceil(Math.max(...rows.map(r=>r.active))/500)*500);
  const y=v=>H-B-(v/max)*(H-T-B), step=(W-L-R)/rows.length, bw=Math.min(24,step*.65);
  let b='';
  for(let i=0;i<=5;i++) {const v=max*i/5;b+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${number(Math.round(v))}</text>`;}
  rows.forEach((r,i)=>{
    const x=L+(i+.5)*step-bw/2, returning=r.active-r.new;
    b+=`<rect x="${x}" y="${y(returning)}" width="${bw}" height="${y(0)-y(returning)}" fill="#4d7059"><title>${dateLabel(r.week)}: ${number(returning)} returning accounts</title></rect><rect x="${x}" y="${y(r.active)}" width="${bw}" height="${y(returning)-y(r.active)}" fill="#a4b591"><title>${dateLabel(r.week)}: ${number(r.new)} new discovery accounts</title></rect>`;
    if(i===0 || i===rows.length-1 || i%Math.ceil(rows.length/4)===0) b+=`<text x="${x+bw/2}" y="${H-12}" text-anchor="middle">${dateLabel(r.week)}</text>`;
  });
  return svg(b,W,H,'Weekly active discovery accounts, split into new and returning accounts');
}
function rateBars(rows, label='Recorded-start rate by craft', unit='accounts') {
  const W=620,H=Math.max(150,rows.length*64+48),L=105,R=95,T=20,B=28;
  const max=Math.max(.3,Math.ceil(Math.max(0,...rows.map(r=>r.rate??0))*10)/10), x=v=>L+(v/max)*(W-L-R);
  let b='';
  for(let i=0;i<=3;i++){const v=max*i/3;b+=`<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="10" y2="${H-B}"/><text x="${x(v)}" y="${H-7}" text-anchor="middle">${percent(v,0)}</text>`;}
  rows.forEach((r,i)=>{const y=T+i*64;
    b+=`<text x="${L-12}" y="${y+17}" text-anchor="end">${escapeText(r.label)}</text><rect x="${L}" y="${y}" width="${Math.max(0,x(r.rate??0)-L)}" height="27" rx="3" fill="${i%2?'#b56f4f':'#4d7059'}"><title>${escapeText(r.label)}: ${number(r.numerator)} of ${number(r.denominator)} ${unit} (${percent(r.rate)})</title></rect><text class="bar-value" x="${x(r.rate??0)+9}" y="${y+17}">${percent(r.rate)}</text><text x="${L}" y="${y+43}">${number(r.numerator)} / ${number(r.denominator)} ${unit}</text>`;
  });
  return svg(b,W,H,label);
}
function startPathChart(s) {
  const saved=s.saved_then_started, direct=s.started-saved;
  return `<div class="start-path"><div class="split-bar" role="img" aria-label="${saved} starts after a save; ${direct} starts without a prior save"><span style="width:${s.started?saved/s.started*100:0}%;background:#4d7059"></span><span style="width:${s.started?direct/s.started*100:0}%;background:#b56f4f"></span></div><div class="path-labels"><div><i style="background:#4d7059"></i><strong>${number(saved)}</strong><span>Saved before starting</span><small>${percent(s.started?saved/s.started:null)} of starters</small></div><div><i style="background:#b56f4f"></i><strong>${number(direct)}</strong><span>No prior save</span><small>${percent(s.started?direct/s.started:null)} of starters</small></div></div></div>`;
}

function keyMetrics(s, weekly) {
  const last = weekly.at(-1), previous = weekly.at(-2);
  const change = last && previous && previous.active ? (last.active / previous.active - 1) : null;
  const comparison = change == null ? '' : ` · ${change >= 0 ? '+' : '−'}${percent(Math.abs(change))} vs prior week`;
  return `<div class="metrics primary-metrics">${metric('Weekly active discovery accounts', number(last?.active), `Latest complete week${comparison}`, 'active')}${metric('14-day recorded start rate', percent(s.activation_rate), `${number(s.started)} / ${number(s.mature)} accounts · full 14 days`, 'activation', true)}${metric('Week 4 discovery retention', percent(s.retention4), s.retention4_eligible ? `${number(s.retention4_n)} of ${number(s.retention4_eligible)} observable accounts` : 'No complete week 4 in the selected cohorts', 'retention')}</div><div id="metric-explainer" hidden></div>`;
}
function overview() {
  const v = slice(), s = v.summary, last = v.weekly.at(-1);
  const direct = s.started - s.saved_then_started;
  const openToStart = s.opened ? s.started / s.opened : null;
  return keyMetrics(s, v.weekly) +
    panel('Weekly discovery activity', 'Distinct accounts · selected cohorts', lineChart(v.weekly, [{ key: 'active', label: 'Active accounts' }, { key: 'recording_users', label: 'Accounts recording a start', coral: true }]) + `<p class="chart-note">Latest week: ${number(last?.new)} new discovery accounts and ${number(last ? last.active - last.new : null)} returning accounts. Recorded starts are a behavioural proxy for making.</p>`, '<div class="legend"><span><i></i>Active accounts</span><span><i class="coral"></i>Recorded a start</span></div>') +
    `<div class="twocol equal">${panel('14-day discovery funnel', 'Stage widths represent accounts; saves are optional.', funnelChart(s) + '<a class="inline-link" href="#funnel">View funnel breakdown →</a>')}${panel('New and returning accounts', 'Weekly discovery activity', stackedActivity(v.weekly), '<div class="legend"><span><i style="background:#a4b591"></i>New</span><span><i></i>Returning</span></div>')}</div>` +
    `<details class="supporting-details"><summary>Supporting measures</summary><div class="supporting-inline"><span>Discovery accounts <strong>${number(s.entrants)}</strong></span><span>Full follow-up <strong>${number(s.mature)}</strong></span><span>Awaiting follow-up <strong>${number(s.immature)}</strong></span><span>Median time to start <strong>${s.median_days==null?'—':s.median_days.toFixed(1)+' days'}</strong><small>among 14-day starters</small></span></div></details>` +
    `<section class="report-summary"><span class="eyebrow">Analysis summary · simulated data</span><h2>The main drop-off is between opening a pattern and recording a start.</h2><p>${percent(openToStart)} of accounts that opened a pattern recorded a start within the follow-up window. ${number(direct)} starters had not saved a pattern first, so saves remain an optional step in the funnel.</p><p><strong>Next investigation:</strong> review whether pattern difficulty and material requirements provide enough information to choose a project. Validate the problem with makers before testing the proposed suitability summary.</p><a class="inline-link" href="#experiment">Review the experiment design →</a><a class="inline-link secondary-action" href="#decision">Product recommendation & impact →</a></section>`;
}
function funnel() {
  const v=slice(),s=v.summary;
  return `<div class="metric-note">${number(s.mature)} accounts with full 14-day follow-up · ${number(s.immature)} awaiting follow-up</div>` +
    panel('Discovery to recorded start', 'Ordered account-level steps · 14 days · saves optional', funnelChart(s)) +
    `<div class="twocol equal">${panel('Activation by craft','Recorded-start rate · mature accounts',rateBars(v.craft_segments.map(r=>({label:r.craft,numerator:r.starts,denominator:r.mature,rate:r.mature?r.starts/r.mature:null}))))}${panel('Routes to a recorded start','Among accounts recording a start within 14 days',startPathChart(s))}</div>` +
    `<section class="report-summary"><span class="eyebrow">Analysis summary · simulated data</span><h2>Investigate the pattern-to-start gap.</h2><p>${percent(s.opened?s.started/s.opened:null)} of pattern openers recorded a start. Review difficulty, materials and suitability information with makers; funnel exits alone do not establish the cause.</p></section>`;
}
function activationRetention() {
  const a=slice().activation_retention;
  if (!a.eligible_accounts) return panel('Activation and later retention','Complete week-four cohorts required','<p class="chart-note">Week four is not observable for these cohorts yet. No starter/non-starter comparison is reported.</p>');
  const rows=a.groups.map(g=>({label:g.activated?'Started ≤14d':'No start ≤14d',rate:g.rate,numerator:g.numerator,denominator:g.denominator}));
  return `<div class="twocol equal">${panel('Activation and later retention','Week 4 return rate · activation fixed at day 14',rateBars(rows,'Week-four discovery retention by day-14 activation status'))}${panel('Composition check','Same craft × experience mix in both groups',`<dl class="comparison-list"><div><dt>Observed retention gap</dt><dd>${points(a.crude_gap)}</dd></div><div><dt>Standardised gap</dt><dd>${points(a.standardised_gap)}</dd></div><div><dt>Common-support coverage</dt><dd>${percent(a.coverage)}</dd></div></dl><p class="chart-note">Association, not causation. Prior intent and other unobserved differences remain.</p><details><summary>How this comparison works</summary><p>Only complete week-four cohorts are included. Day-14 starter status is fixed before the return window. Standardisation uses pooled craft and experience weights in the ${a.common_strata} strata containing both groups; ${number(a.common_support_accounts)} of ${number(a.eligible_accounts)} eligible accounts are covered.</p></details>`)}</div>`;
}
function retention() {
  const v = slice(), s = v.summary;
  const curve = Array.from({ length: 8 }, (_, i) => {
    const cells = v.cohorts.map((c) => c.cells[i + 1]).filter((c) => c.mature);
    const denominator = cells.reduce((a, c) => a + c.denominator, 0);
    return { label: `Week ${i + 1}`, rate: denominator ? cells.reduce((a, c) => a + c.numerator, 0) / denominator : null };
  });
  const rows = v.cohorts.map((c, row) => `<tr><td class="row-label">${dateLabel(c.cohort)}</td><td class="row-label numeric">${number(c.users)}</td>${c.cells.map((cell, col) => {
    const alpha = cell.rate == null ? 0 : .06 + Math.min(cell.rate, .6) / .6 * .79;
    const style = cell.mature ? `background:rgba(77,112,89,${alpha});color:${cell.rate >= .38 ? '#fff' : '#304f3c'}` : '';
    const title = cell.mature ? `${dateLabel(c.cohort)} cohort, week ${col}: ${cell.numerator} of ${cell.denominator} accounts returned (${percent(cell.rate)})` : `${dateLabel(c.cohort)} cohort, week ${col}: full observation window has not elapsed`;
    return `<td><button class="cell${cell.mature ? '' : ' future'}" data-cell="${row},${col}" style="${style}" aria-label="${title}" title="${title}">${cell.mature ? percent(cell.rate, 0) : '—'}</button></td>`;
  }).join('')}</tr>`).join('');
  return `<div class="metrics primary-metrics">${metric('First-discovery cohorts', number(v.cohorts.length), 'Monday–Sunday calendar weeks')}${metric('Week 4 discovery retention', percent(s.retention4), `${number(s.retention4_n)} / ${number(s.retention4_eligible)} accounts observable`, 'retention', true)}${metric('Not yet observable at week 4', number(s.entrants - s.retention4_eligible), 'Kept out of the week 4 denominator')}</div><div id="metric-explainer" hidden></div>` +
    activationRetention() +
    panel('Retention by first-discovery cohort', 'Calendar-week return rate · select a cell for counts', `<div class="table-wrap"><table class="cohort-table"><thead><tr><th>Cohort starts</th><th>Accounts</th>${Array.from({ length: 9 }, (_, i) => `<th>W${i}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><div class="cohort-key"><span class="sub">— means not yet observable, not zero retention. W0 is 100% by definition.</span><div class="scale">0% ${[.06, .25, .45, .65, .85].map((a) => `<i style="background:rgba(77,112,89,${a})"></i>`).join('')}60%+</div></div><div id="cohort-detail" class="cohort-detail">Each cell counts accounts once, even if someone visits several times that week.</div>`) +
    `<div class="twocol">${panel('Weekly retention curve', 'Weighted across cohorts with a complete window for each week.', lineChart(curve, [{ key: 'rate', label: 'Returned' }], { rate: true, label: 'Calendar-week discovery retention among observable cohorts' }) + '<p class="chart-note">Only complete observation windows; eligible cohorts vary by week.</p>')}${panel('Retention checkpoints','Observable accounts at each horizon',rateBars([1,4,8].map(week=>{const cells=v.cohorts.map(c=>c.cells[week]).filter(c=>c.mature);const denominator=cells.reduce((a,c)=>a+c.denominator,0),numerator=cells.reduce((a,c)=>a+c.numerator,0);return {label:`Week ${week}`,numerator,denominator,rate:denominator?numerator/denominator:null};}),'Retention at weeks one, four and eight'))}</div>`;
}
function intervalChart(primary, guardrail) {
  const values = [{ name: 'Recorded starts', x: primary }, { name: 'Abandonment', x: guardrail }];
  const W = 800, H = 190, L = 155, R = 34;
  const lo = Math.min(-.02, ...values.map((v) => v.x.ci_low)) * 100;
  const hi = Math.max(.03, ...values.map((v) => v.x.ci_high)) * 100;
  const x = (v) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  let body = `<line x1="${x(0)}" x2="${x(0)}" y1="17" y2="135" stroke="#a69aa9" stroke-dasharray="4 4"/>`;
  for (let i = Math.ceil(lo); i <= Math.floor(hi); i++) body += `<text x="${x(i)}" y="162" text-anchor="middle">${i > 0 ? '+' : ''}${i}</text>`;
  values.forEach((v, i) => {
    const y = 45 + i * 65, color = i ? '#b56f4f' : '#4d7059';
    body += `<text x="${L - 15}" y="${y + 4}" text-anchor="end">${v.name}</text><line x1="${x(v.x.ci_low * 100)}" x2="${x(v.x.ci_high * 100)}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="3"/><circle cx="${x(v.x.difference * 100)}" cy="${y}" r="6" fill="${color}"><title>${v.name}: ${points(v.x.difference)}; 95% CI ${points(v.x.ci_low)} to ${points(v.x.ci_high)}</title></circle>`;
    for (const bound of [v.x.ci_low, v.x.ci_high]) body += `<line x1="${x(bound * 100)}" x2="${x(bound * 100)}" y1="${y - 6}" y2="${y + 6}" stroke="${color}" stroke-width="2"/>`;
  });
  body += `<text x="${(L + W - R) / 2}" y="184" text-anchor="middle">Treatment − control, percentage points · 95% Newcombe intervals</text>`;
  return svg(body, W, H, 'Simulated experiment effects with 95% confidence intervals');
}
function designerAttention() {
  const a=DATA.attention.scenarios[attentionScenario], c=a.arms.control, t=a.arms.treatment;
  const rows=[{label:'Control',rate:c.top_share,numerator:c.top_impressions,denominator:c.impressions},{label:'Treatment',rate:t.top_share,numerator:t.top_impressions,denominator:t.impressions}];
  const status=a.status==='within margin'?'Within the attention margin':a.status==='material harm'?'Material concentration harm':'Attention result inconclusive';
  return panel('Designer attention guardrail','Share of impressions allocated to the fixed pre-period top 10% of designers',`<div class="attention-control"><label for="attention-assumption">Exposure assumption</label><select id="attention-assumption"><option value="neutral"${attentionScenario==='neutral'?' selected':''}>Neutral exposure</option><option value="concentration_stress"${attentionScenario==='concentration_stress'?' selected':''}>Concentration stress test</option></select><span class="small-pill">SIMULATED IMPRESSIONS</span></div><div class="twocol equal attention-grid"><div>${rateBars(rows,'Impression share received by pre-period top-decile designers','impressions')}</div><div><dl class="comparison-list"><div><dt>Treatment − control</dt><dd>${points(a.difference)}</dd></div><div><dt>95% cluster-bootstrap interval</dt><dd>${points(a.ci_low)} to ${points(a.ci_high)}</dd></div><div><dt>Illustrative harm margin</dt><dd>+3.00 pp</dd></div></dl><p class="guardrail-status ${a.status==='within margin'?'pass':'review'}">${status}</p><p class="chart-note">All assigned accounts are resampled as clusters, including ${number(c.without_impressions+t.without_impressions)} with no impressions. This preserves within-account dependence.</p></div></div><details><summary>Assumptions and inference</summary><p>A separate fictional pre-period fixes the top-designer group. The neutral scenario assumes 50% exposure in both arms; the stress scenario assumes 58% in treatment. ${a.bootstrap_repetitions} fixed-seed account-cluster resamples estimate the interval. These are added sensitivity assumptions, not measured Ravelry effects or a model of market feedback. The original primary/abandonment decision rules are unchanged.</p></details>`);
}
function experiment() {
  const r = DATA.experiment[scenario], p = r.primary, g = r.abandonment_guardrail, planning = DATA.experiment.planning;
  const primaryPassed = r.decision.startsWith('meets');
  const attention = DATA.attention.scenarios[attentionScenario];
  const passed = primaryPassed && attention.status === 'within margin';
  const criterion = (text, pass) => `<li><span>${text}</span><span class="${pass ? 'pass' : 'review'}">${pass ? 'Met' : 'Not met'}</span></li>`;
  return `<div class="scenario-toggle" role="group" aria-label="Synthetic experiment scenario"><button data-scenario="assumed_effect" class="${scenario === 'assumed_effect' ? 'active' : ''}" aria-pressed="${scenario === 'assumed_effect'}">Assumed effect</button><button data-scenario="null" class="${scenario === 'null' ? 'active' : ''}" aria-pressed="${scenario === 'null'}">No-effect scenario</button></div>` +
    `<div class="metric-note">Separate simulated experiment · 50/50 account-level assignment · full 14-day follow-up · this population is independent of the funnel and retention demo.</div>` +
    `<div class="metrics">${metric('Assigned accounts', number(r.assigned), `${number(p.control_n)} control · ${number(p.treatment_n)} treatment`)}${metric('Absolute effect on starts', points(p.difference), `95% CI ${points(p.ci_low)} to ${points(p.ci_high)}`, '', true)}${metric('Relative effect', percent(p.relative_lift), `Control ${percent(p.control_rate)} → treatment ${percent(p.treatment_rate)}`)}${metric('Sample-ratio check', r.srm_p.toFixed(3), 'p-value against 50/50 · flag below 0.001')}</div>` +
    `<div class="decision${passed ? '' : ' inconclusive'}"><strong>${passed ? 'Numerical checks clear the extended illustrative review.' : 'Hold: the extended illustrative review is not cleared.'}</strong><p>${!primaryPassed ? 'The original primary/abandonment criteria are not met.' : attention.status !== 'within margin' ? 'The original criteria pass, but the designer-attention sensitivity does not clear its harm margin.' : 'Starts, abandonment and the selected attention assumption clear their numerical margins. Experience quality and real user evidence remain unresolved.'} Simulation only; this is not a Ravelry launch decision.</p></div>` +
    panel('Treatment effects and uncertainty', 'A positive start effect is desirable. A positive abandonment effect is harm. These need different interpretations.', intervalChart(p, g)) +
    designerAttention() +
    `<div class="twocol equal">${panel('Decision criteria', 'Fixed thresholds in code; not adjusted to make this result pass.', `<ul class="criteria-list">${criterion('Start-rate lower 95% bound above zero', p.ci_low > 0)}${criterion('Start-rate estimate at least +1 percentage point', p.difference >= .01)}${criterion('Abandonment upper 95% bound below +1 point', g.ci_high < .01)}${criterion('No SRM flag; all windows mature', r.srm_p >= .001 && r.immature === 0)}</ul><p class="chart-note">Primary two-proportion test p=${p.p_value.toFixed(4)}. Passing SRM and observed balance do not prove the implementation is correct.</p>`)}<section class="insight"><span class="eyebrow">Planning, not hindsight</span><h2>Sample size and power</h2><p>With an assumed ${percent(planning.assumed_baseline,2)} overall baseline and a +1.5-point effect, the required sample is approximately <strong>${number(planning.required_total)}</strong> accounts for 80% power at a two-sided 5% significance level.</p><p>At 10,800 accounts per arm, the approximate minimum detectable effect is ${points(planning.mde_at_10800_per_arm)}. The overall baseline includes the simulated experience/craft mix; 12% is the reference-group probability. A real baseline and marketplace dynamics could change the design.</p></section></div>` +
    panel('Validation and marketplace considerations', 'One primary outcome, a fixed analysis horizon, and no treating repeated events as independent people.', `<div class="analysis-list" style="margin-bottom:0"><article class="analysis-item"><span class="number">01</span><h3>Follow-up and completeness</h3><p>${number(r.mature)} assignments have mature follow-up. The simulation assumes complete telemetry; event/outcome mismatches deliberately fail validation.</p></article><article class="analysis-item"><span class="number">02</span><h3>A null result is allowed</h3><p>Across ${DATA.experiment.null_calibration.repetitions} fixed-seed A/A checks, ${percent(DATA.experiment.null_calibration.false_positive_fraction)} reject a true null. The seed is fixed before analysis.</p></article><article class="analysis-item"><span class="number">03</span><h3>The shared marketplace</h3><p>Maker attention and designer feedback are shared. A user-level test may not predict full rollout. The attention sensitivity models impression allocation, not network effects. Experience quality and real exposure still need instrumentation.</p></article></div>`);
}
function opportunityChart(rows) {
  const W=620,H=260,L=104,R=62,T=18,B=30,max=Math.max(1,...rows.map(r=>r.additional_recorded_starts))*1.15;
  const x=v=>L+v/max*(W-L-R);
  let b='';
  for(let i=0;i<=4;i++){const v=max*i/4;b+=`<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="10" y2="${H-B}"/><text x="${x(v)}" y="${H-8}" text-anchor="middle">${Math.round(v)}</text>`;}
  rows.forEach((r,i)=>{const y=T+i*51;b+=`<text x="${L-12}" y="${y+18}" text-anchor="end">+${(r.absolute_lift*100).toFixed(1)} pp</text><rect x="${L}" y="${y}" width="${x(r.additional_recorded_starts)-L}" height="29" rx="3" fill="${r.absolute_lift===impactLift?'#b56f4f':'#8b9f78'}"><title>Assumed lift ${(r.absolute_lift*100).toFixed(1)} percentage points: ${r.additional_recorded_starts.toFixed(1)} additional recorded starts at ${percent(r.coverage,0)} coverage</title></rect><text class="bar-value" x="${x(r.additional_recorded_starts)+8}" y="${y+19}">~${Math.round(r.additional_recorded_starts)}</text>`;});
  return svg(b,W,H,'Scenario-based additional recorded starts, not a forecast or confidence interval');
}
function decision() {
  const d=DATA.decision, selected=d.scenarios.find(s=>s.coverage===impactCoverage && s.absolute_lift===impactLift);
  const rows=d.scenarios.filter(s=>s.coverage===impactCoverage);
  const a=DATA.attention.scenarios[attentionScenario], primary=DATA.experiment[scenario];
  const numerical=primary.decision.startsWith('meets') && a.status==='within margin';
  return `<div class="decision"><strong>Recommendation: validate a suitability summary, then run a bounded experiment.</strong><p>Research focus: new-to-craft makers choosing a project. Confirm the problem in the existing Ravelry flow before building. The simulation illustrates the decision process; it does not establish demand.</p></div><div class="metrics primary-metrics">${metric('Planning cohort',number(d.eligible_accounts),'New-to-craft discovery accounts · full 14-day follow-up')}${metric('Simulated baseline start rate',percent(d.baseline_rate),'Fixed cohort from this demo; not future traffic')}${metric('Additional recorded starts',`~${Math.round(selected.additional_recorded_starts)}`,`${percent(impactCoverage,0)} coverage × +${(impactLift*100).toFixed(1)} pp assumed lift`,'',true)}</div>` +
    panel('Opportunity sizing','Sensitivity to assumed absolute lift and eligible-account coverage',`<div class="decision-controls"><div><label for="impact-lift">Assumed absolute lift</label><select id="impact-lift">${[.005,.01,.015,.02].map(v=>`<option value="${v}"${v===impactLift?' selected':''}>+${(v*100).toFixed(1)} percentage points</option>`).join('')}</select></div><div><label for="impact-coverage">Eligible-account coverage</label><select id="impact-coverage">${[.5,.75,1].map(v=>`<option value="${v}"${v===impactCoverage?' selected':''}>${percent(v,0)}</option>`).join('')}</select></div></div>${opportunityChart(rows)}<p class="chart-note">${number(d.eligible_accounts)} eligible accounts × coverage × absolute lift. Assumption-based scenarios, not a forecast or confidence interval. Coverage means enrolled/reached eligible accounts, not a post-treatment exposed-user analysis.</p>`) +
    `<div class="twocol equal">${panel('Test and rollout criteria','Illustrative margins; agree real thresholds before a real test',`<ul class="criteria-list"><li><span>Recorded starts · primary</span><strong>Lower 95% bound &gt; 0; estimate ≥ +1 pp</strong></li><li><span>Discovery abandonment</span><strong>Upper 95% bound &lt; +1 pp</strong></li><li><span>Top-designer exposure share</span><strong>Cluster upper 95% bound &lt; +3 pp</strong></li><li><span>Data quality and experience</span><strong>Mature windows, valid assignment, quality evidence</strong></li></ul>`)}${panel('Current simulated review','Uses the experiment and attention selections',`<p class="guardrail-status ${numerical?'pass':'review'}">${numerical?'Numerical margins cleared':'Hold: numerical margins not cleared'}</p><dl class="comparison-list"><div><dt>Outcome scenario</dt><dd>${scenario==='null'?'No effect':'Assumed effect'}</dd></div><div><dt>Exposure assumption</dt><dd>${attentionScenario==='neutral'?'Neutral':'Concentration stress'}</dd></div></dl><p class="chart-note">Even a numerical pass is insufficient for real rollout. Next evidence: current-flow audit, maker comprehension, designer feedback and reliable internal tracking.</p><a class="inline-link" href="#experiment">Inspect experiment and guardrails →</a>`)}</div>`;
}
function concentration(values) {
  const sorted = [...values].sort((a, b) => a - b), total = sorted.reduce((a, v) => a + v, 0);
  return [{ x: 0, y: 0 }, ...sorted.map((v, i) => ({ x: (i + 1) / sorted.length, y: total ? sorted.slice(0, i + 1).reduce((a, b) => a + b, 0) / total : 0 }))];
}
function concentrationChart(records) {
  const designers = new Map();
  records.forEach((r) => designers.set(r.designer, (designers.get(r.designer) || 0) + r.projects));
  const W = 800, H = 255, L = 42, R = 16, T = 12, B = 43;
  const x = (v) => L + v * (W - L - R), y = (v) => H - B - v * (H - T - B);
  let b = '';
  for (let i = 0; i <= 4; i++) { const v = i / 4; b += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${percent(v, 0)}</text><text x="${x(v)}" y="${H - 23}" text-anchor="middle">${percent(v, 0)}</text>`; }
  b += `<line x1="${x(0)}" y1="${y(0)}" x2="${x(1)}" y2="${y(1)}" stroke="#bfb6c5" stroke-dasharray="4 4"/>`;
  for (const [values, coral] of [[records.map((r) => r.projects), false], [[...designers.values()], true]]) {
    b += `<path class="series${coral ? ' coral' : ''}" d="${concentration(values).map((p, i) => `${i ? 'L' : 'M'}${x(p.x)},${y(p.y)}`).join(' ')}"/>`;
  }
  b += `<text x="${W / 2}" y="${H - 4}" text-anchor="middle">Share of sample entities, ordered by recorded activity</text>`;
  return svg(b, W, H, 'Cumulative share of recorded projects across sampled patterns and observed designers');
}
function catalogue() {
  if (!CATALOGUE) return `<section class="empty-state"><h2>The real snapshot stays local.</h2><p>This copy of the app has the full simulated product analysis. To explore the real catalogue section, run <code>make model app-export</code> from a local checkout with your authorised API snapshot.</p><p>The real-data payload is deliberately excluded from Git. It contains no API credentials and is never needed for the funnel, retention or experiment sections.</p></section>`;
  const r = CATALOGUE.records.filter((v) => catalogueCraft === 'All crafts' || v.craft === catalogueCraft);
  const total = r.reduce((a, v) => a + v.projects, 0), unknown = r.filter((v) => v.rating_count == null).length;
  const designerCount = new Set(r.map((v) => v.designer)).size;
  const topN = Math.max(1, Math.ceil(r.length * .1));
  const topShare = r.map((v) => v.projects).sort((a, b) => b - a).slice(0, topN).reduce((a, b) => a + b, 0) / (total || 1);
  const evidence = [['Unknown rating count', unknown], ['Fewer than 10 ratings', r.filter((v) => v.rating_count != null && v.rating_count < 10).length], ['10 or more ratings', r.filter((v) => v.rating_count >= 10).length]];
  return `<div class="catalogue-filters"><label for="catalogue-craft">Craft within the sample</label><select id="catalogue-craft">${['All crafts', 'Knitting', 'Crochet'].map((v) => `<option${v === catalogueCraft ? ' selected' : ''}>${v}</option>`).join('')}</select><span>${dateLabel(CATALOGUE.extracted_at)} snapshot · local only</span></div>` +
    `<div class="metrics">${metric('Patterns in this selection', number(r.length), 'Convenience text-search sample: “cowl”')}${metric('Observed designers', number(designerCount), 'From embedded catalogue identifiers')}${metric('Recorded project total', number(total), 'Snapshot totals, not unique makers')}${metric('Rating count unknown', percent(r.length ? unknown / r.length : null), `${number(unknown)} of ${number(r.length)} patterns`, '', true)}</div>` +
    `<div class="callout">Real API data, separate from the simulated events. Search order is unspecified and the sample is not representative. Low recorded activity does not establish low exposure.</div>` +
    panel('How concentrated is recorded activity?', 'Cumulative share of projects within the collected sample. Dashed line shows equal shares.', concentrationChart(r), '<div class="legend"><span><i></i>Patterns</span><span><i class="coral"></i>Designers</span></div>') +
    `<div class="twocol equal">${panel('How much evidence sits behind a rating?', 'An unknown count stays unknown; it is not silently set to zero.', `<div class="mini-funnel">${evidence.map(([label, count], i) => `<div class="mini-stage" style="grid-template-columns:145px 1fr 35px"><span>${label}</span><div class="bar-track"><div style="width:${count / (r.length || 1) * 100}%;background:${i === 0 ? '#4d7059' : '#9e89af'}"></div></div><strong>${number(count)}</strong></div>`).join('')}</div><p class="chart-note">Averages without a positive known count are excluded from analysis-ready quality fields.</p>`)}<section class="insight"><span class="eyebrow">Catalogue interpretation</span><h2>Recorded activity is concentrated.</h2><p>The top ${number(topN)} patterns account for ${percent(topShare)} of recorded projects in this selection. Age, visibility, metadata and the search itself could all contribute.</p><p>Exposure data and age-adjusted research are needed to understand the distribution. Low recorded activity alone does not establish an opportunity.</p></section></div>`;
}
function methods() {
  const duplicates = DATA.meta.received_events - DATA.meta.unique_events;
  const eventRows = [['discovery_viewed', 'A rendered discovery view', 'Starts the observational discovery cohort; not experiment assignment.'], ['pattern_opened', 'A pattern detail view', 'Allows an ordered funnel; repeated opens still count as one account.'], ['pattern_saved', 'A newly saved pattern', 'Optional branch; not required to start.'], ['project_started', 'A newly recorded in-progress project', 'Behavioural proxy for making, not evidence of actual making.']];
  return `<section class="panel readable"><span class="eyebrow">Measurement framework</span><div class="metric-tree"><div><strong>Feeling ready to start</strong><small>The underlying benefit. These events don’t directly observe confidence.</small></div><div><strong>A recorded project start</strong><small>A practical behavioural proxy, with a defined denominator and window.</small></div><div><strong>A useful return visit</strong><small>Discovery retention adds context; frequent making isn’t the expectation.</small></div></div><p class="sub">Designer exposure and experience quality belong alongside these outcomes in a real implementation. Designer exposure is demonstrated in a separate simulated sensitivity analysis. Real experience-quality evidence remains unavailable.</p></section>` +
    `<div class="method-grid"><section class="panel"><h2>Metric calculation rules</h2><details><summary>Why these denominators?</summary><p>The observational start rate uses first-discovery accounts with a full 14-day window. Funnel steps use that same denominator, ordered across sessions, for any pattern. This is distinct from the experiment’s intention-to-treat denominator: all assigned eligible accounts with mature follow-up.</p></details><details><summary>What counts as retention?</summary><p>A qualifying discovery, open, save or start event in a later Monday–Sunday calendar week. The cohort starts with first discovery, not signup. Each account counts once per week. W4 requires the entire fifth calendar week from the cohort’s start to have elapsed. Incomplete cells remain unobserved.</p></details><details><summary>What happens to duplicate events?</summary><p>The received stream includes ${number(duplicates)} deliberate transport retry copies with the same event_id. SQL keeps the earliest received copy. ${number(DATA.meta.received_events)} received rows become ${number(DATA.meta.unique_events)} business events before metrics are calculated.</p></details><details><summary>How should segment differences be interpreted?</summary><p>Craft and experience rates are exploratory associations. The generator deliberately varies intent, experience and behaviour. Those assumptions are not discoveries about Ravelry’s users. Segment breakdowns support composition checks and follow-up research.</p></details></section><section class="panel"><h2>Data sources</h2><details><summary>The product metrics are simulated</summary><p>A fixed seed generates 12,000 fictional accounts and an event stream over 16 weeks. Initial discovery, opens, saves, starts and declining return probabilities are explicit modelling assumptions. Intent links early use and later visits. This is not calibrated behavioural data and has complete telemetry by construction.</p></details><details><summary>The experiment is a separate simulation</summary><p>The seeded effect and null scenarios use their own assignments, events and assumptions. Their population does not change with the product-demo filters. Neither scenario establishes that the proposed feature works.</p></details><details><summary>The catalogue comes from Ravelry</summary><p>A five-pattern feasibility check preceded the bounded 50-pattern cowl search. Only the required catalogue fields are retained. Real records and derived payloads stay local; source code and synthetic aggregates are in the public source repository. There is no evidence of real impressions, funnels or retention in the API snapshot.</p></details><details><summary>Recommended next evidence</summary><p>Audit the current discovery experience, watch makers choose a project, speak to designers, validate the recording proxy, and establish internal baselines. Then assess assignment, exposure, safety and shared-market interference before choosing a real test.</p></details></section></div>` +
    panel('Event-to-metric lineage', 'Python generator → DuckDB → dbt models and quality checks → aggregate JSON → this app.', `<div class="table-wrap"><table><thead><tr><th>Proposed event</th><th>Trigger</th><th>Why it is needed</th></tr></thead><tbody>${eventRows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="chart-note">The full proposed tracking plan adds account/session identity, timestamps, experiment assignment, schema versions and impression visibility rules. These names are a proposal, not a claim about existing Ravelry instrumentation.</p>`) +
    panel('SQL models', 'These are the dbt models that produce the product journey and retention tables.', `<label for="sql-model" class="sr-only">SQL model</label><select id="sql-model">${Object.keys(DATA.sql).map((name) => `<option>${name}</option>`).join('')}</select><pre><code id="sql-code"></code></pre><a class="inline-link" href="https://github.com/stephanieboyle/ravelry-discovery-portfolio/tree/main/dbt_product" target="_blank" rel="noreferrer">Models, tests and definitions in the repository ↗</a>`);
}
function render() {
  page = Object.hasOwn(pages, location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  const [chapter, title, description] = pages[page];
  $('#chapter').textContent = chapter; $('#page-title').textContent = title; $('#page-description').textContent = description;
  if (page === 'overview') {
    const s = slice().summary;
    $('#page-description').textContent = s.mature ? `In this simulated journey, ${percent(s.opened / s.mature)} of accounts with full follow-up open a pattern, but ${percent(s.activation_rate)} record a project start within 14 days. The biggest drop-off comes after opening a pattern.` : 'These cohorts are still completing their 14-day follow-up. Start rates will remain unobserved until that window closes.';
  }
  document.title = `${title} · Count Your Stitches`;
  const badge = $('#source-badge');
  badge.className = `source-badge${page === 'catalogue' ? ' real' : page === 'methods' ? ' mixed' : ''}`;
  badge.textContent = page === 'catalogue' ? 'REAL API · PRIVATE LOCAL SNAPSHOT' : page === 'methods' ? 'SOURCES & DEFINITIONS' : 'SIMULATED PRODUCT EVENTS';
  $('#filters').hidden = !['overview', 'funnel', 'retention'].includes(page);
  const selectedCohorts = slice().cohorts;
  $('.filter-end > span').textContent = selectedCohorts.length ? `${dateLabel(selectedCohorts[0].cohort)}–25 Oct 2026` : 'No selected cohorts';
  document.querySelectorAll('nav a').forEach((a) => { a.classList.toggle('active', a.dataset.page === page); if (a.dataset.page === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#content').innerHTML = ({ overview, funnel, retention, experiment, decision, catalogue, methods })[page]();
  document.querySelectorAll('[data-definition]').forEach((b) => b.addEventListener('click', () => {
    const target = $('#metric-explainer'); target.textContent = defs[b.dataset.definition]; target.hidden = false;
  }));
  document.querySelectorAll('[data-scenario]').forEach((b) => b.addEventListener('click', () => { scenario = b.dataset.scenario; render(); }));
  document.querySelectorAll('[data-cell]').forEach((b) => b.addEventListener('click', () => {
    const [r, c] = b.dataset.cell.split(',').map(Number), cohort = slice().cohorts[r], cell = cohort.cells[c];
    document.querySelectorAll('[data-cell]').forEach((v) => v.classList.remove('selected')); b.classList.add('selected');
    $('#cohort-detail').textContent = cell.mature ? `${dateLabel(cohort.cohort)} cohort · week ${c}: ${number(cell.numerator)} of ${number(cell.denominator)} accounts had a qualifying event (${percent(cell.rate)}). Calendar-week retention, not a rolling-day measure.` : `${dateLabel(cohort.cohort)} cohort · week ${c}: the entire observation week has not elapsed by 26 October. There is no retention estimate for this cell yet.`;
  }));
  if ($('#attention-assumption')) $('#attention-assumption').addEventListener('change',(e)=>{attentionScenario=e.target.value;render();});
  if ($('#impact-lift')) $('#impact-lift').addEventListener('change',(e)=>{impactLift=Number(e.target.value);render();});
  if ($('#impact-coverage')) $('#impact-coverage').addEventListener('change',(e)=>{impactCoverage=Number(e.target.value);render();});
  if ($('#catalogue-craft')) $('#catalogue-craft').addEventListener('change', (e) => { catalogueCraft = e.target.value; render(); });
  if ($('#sql-model')) { const update = () => { $('#sql-code').textContent = DATA.sql[$('#sql-model').value]; }; $('#sql-model').addEventListener('change', update); update(); }
}
function downloadSlice() {
  const v = slice(), s = v.summary;
  const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['source', 'craft', 'experience', 'cohort_window', 'metric', 'value'], ...Object.entries(s).map(([k, value]) => ['SIMULATED', $('#craft').value, $('#experience').value, $('#window').value, k, value])];
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'simulated-discovery-metrics.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function start() {
  try {
    if (window.PRODUCT_DEMO_DATA) {
      DATA = window.PRODUCT_DEMO_DATA;
    } else {
      const response = await fetch('data.json');
      if (!response.ok) throw new Error('The metric export is missing. Run make app-data before starting the app.');
      DATA = await response.json();
    }
    // This optional payload is ignored by Git and available only in the local private preview.
    if (window.PRODUCT_CATALOGUE_DATA) CATALOGUE = window.PRODUCT_CATALOGUE_DATA;
    else if (!window.PRODUCT_DEMO_DATA) {
      try { const r = await fetch('catalogue.private.json'); if (r.ok) CATALOGUE = await r.json(); } catch (_) { /* Standalone synthetic demo remains fully usable. */ }
    }
    for (const id of ['craft', 'experience', 'window']) $(`#${id}`).addEventListener('change', render);
    $('#download').addEventListener('click', downloadSlice);
    $('.skip').addEventListener('click', (event) => { event.preventDefault(); $('#main').focus(); $('#main').scrollIntoView(); });
    window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0, behavior: 'auto' }); });
    $('#loading').hidden = true; $('#app').hidden = false; render();
  } catch (err) { $('#loading').textContent = `Could not load the analysis. ${err.message}`; $('#loading').classList.add('error'); }
}
start();
