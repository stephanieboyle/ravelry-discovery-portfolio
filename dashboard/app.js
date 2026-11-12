'use strict';
const $ = (selector) => document.querySelector(selector);
const number = (v) => v == null ? '—' : new Intl.NumberFormat('en-GB').format(v);
const percent = (v, places = 1) => v == null ? '—' : `${(v * 100).toFixed(places)}%`;
const points = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(2)} pp`;
const dateLabel = (value) => new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const escapeText = (s) => String(s).replace(/[&<>"']/g, (v) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[v]));
let DATA, CATALOGUE = null;
let page = 'overview', scenario = 'assumed_effect', catalogueCraft = 'All crafts';
const defs = {
  entrants: 'Distinct accounts with a first discovery_viewed event in the selected cohorts. An account is counted once. These are simulated accounts, not Ravelry users.',
  activation: 'Accounts recording a project_started event after a pattern open and within 14 days of first discovery ÷ discovery accounts with a complete 14-day window. Saves are optional. This is recorded behaviour, not proof of actually making something.',
  retention: 'Selected discovery accounts with an event during calendar week 4 after their first-discovery week ÷ accounts in cohorts whose entire week 4 has elapsed. Qualifying events: discovery view, pattern open, save or recorded start.',
  time: 'Median elapsed days from first discovery to first recorded start, among mature accounts that recorded one within 14 days. It excludes non-starters and is not time-to-start for all users.',
};
const pages = {
  overview: ['01 / The product question', 'What happens between finding a pattern and starting one?', 'Finding something you like is part of the job. I want to understand whether discovery helps people get far enough to give it a go.'],
  funnel: ['02 / Activation', 'Where are people getting stuck?', 'I’ve followed the journey from a first discovery visit to a recorded project start. Saving a pattern is useful context, but people don’t have to save one to start it.'],
  retention: ['03 / Retention', 'Do people come back?', 'A busy first visit can look promising. I also want to know whether discovery becomes something people return to, and which cohorts have had enough time to tell us.'],
  experiment: ['04 / Experimentation', 'Would I ship it?', 'The hypothesis: clearer suitability information helps makers record a project start. Here’s how I’d evaluate the result, including a scenario where the feature does nothing.'],
  catalogue: ['05 / Real-world context', 'What can the actual catalogue tell us?', 'This section uses the real Ravelry API sample. It adds context about patterns and designers; it doesn’t tell me what people saw or why they chose something.'],
  methods: ['06 / The analytical choices', 'The numbers need a definition.', 'This is where the slightly less glamorous work lives: event design, denominators, follow-up windows, SQL, and checking that the data means what I think it means.'],
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
    if (!s.coral && valid.length > 1) parts += `<path d="${path} L${x(valid.at(-1).i)},${H - B} L${x(valid[0].i)},${H - B} Z" fill="#70548c" opacity=".055"/>`;
    parts += `<path class="series${s.coral ? ' coral' : ''}" d="${path}"/>`;
    valid.forEach((p) => { parts += `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="3.5" fill="${s.coral ? '#c97552' : '#70548c'}" tabindex="0"><title>${rows[p.i].label || dateLabel(rows[p.i].week)} · ${s.label}: ${rate ? percent(p.v) : number(p.v)}</title></circle>`; });
  });
  return svg(parts, W, H, label);
}
function miniFunnel(s) {
  return `<div class="mini-funnel">${[['Discovery', s.mature], ['Pattern opened', s.opened], ['Start recorded', s.started]].map(([name, count]) => `<div class="mini-stage"><span>${name}</span><div class="bar-track"><div style="width:${s.mature ? count / s.mature * 100 : 0}%"></div></div><strong>${number(count)}</strong></div>`).join('')}</div>`;
}
function keyMetrics(s) {
  return `<div class="metrics">${metric('Discovery accounts', number(s.entrants), `${number(s.mature)} have a complete 14-day window`, 'entrants')}${metric('Recorded starts · 14 days', percent(s.activation_rate), `${number(s.started)} of ${number(s.mature)} mature accounts`, 'activation', true)}${metric('Week 4 discovery retention', percent(s.retention4), s.retention4_eligible ? `${number(s.retention4_n)} of ${number(s.retention4_eligible)} observable accounts` : 'No selected cohorts have a complete week 4', 'retention')}${metric('Time to recorded start', s.median_days == null ? '—' : `${s.median_days.toFixed(1)} days`, 'Median among people who recorded a start within 14 days', 'time')}</div><div id="metric-explainer" hidden></div>`;
}
function overview() {
  const v = slice(), s = v.summary;
  const direct = s.started - s.saved_then_started;
  return keyMetrics(s) +
    panel('A return visit is part of the story', 'Weekly discovery activity for the selected cohorts. These are people, not event counts.', lineChart(v.weekly, [{ key: 'active', label: 'Discovery accounts active' }, { key: 'recording_users', label: 'Accounts recording a start', coral: true }]) + '<p class="chart-note">Returning users and new entrants both contribute to activity. A change in this chart is descriptive, not a treatment effect.</p>', '<div class="legend"><span><i></i>Active in discovery</span><span><i class="coral"></i>Recorded a start</span></div>') +
    `<div class="twocol">${panel('Where the journey narrows', 'Same mature-account denominator at every step; 14 days from first discovery.', miniFunnel(s) + '<a class="inline-link" href="#funnel">Explore the funnel →</a>')}<section class="insight"><span class="eyebrow">The working hypothesis</span><h2>Help me judge whether I can actually make this.</h2><p>I’d test clearer information about fit, materials and uncertainty within existing discovery. More choice isn’t automatically more useful choice.</p><a href="#experiment">How I’d test that →</a></section></div>` +
    `<div class="chapter-line"><h2>What I’d look at first</h2><span class="eyebrow">What the numbers would make me ask</span></div><div class="analysis-list"><article class="analysis-item"><span class="number">01</span><h3>The gap after browsing</h3><p>${percent(s.mature ? s.opened / s.mature : null)} of mature accounts open a pattern within 14 days. I’d look at where the experience stops helping, rather than assuming every exit is a failure.</p></article><article class="analysis-item"><span class="number">02</span><h3>Saving isn’t the whole journey</h3><p>${number(direct)} of ${number(s.started)} starters did not save before their first recorded start. A mandatory save step would hide part of the journey.</p></article><article class="analysis-item"><span class="number">03</span><h3>What would change my mind?</h3><p>A real test needs a worthwhile change in recorded starts, acceptable abandonment, and evidence about the experience for makers and designers.</p></article></div>`;
}
function funnel() {
  const v = slice(), s = v.summary;
  const rows = [['Entered discovery', 'First observed discovery visit', s.mature], ['Opened a pattern', 'At least one detail open', s.opened], ['Recorded a start', 'After an open; save not required', s.started]];
  const body = rows.map(([name, note, count], i) => `${i ? `<p class="drop-label">${number(rows[i - 1][2] - count)} accounts did not reach this step · ${percent(rows[i - 1][2] ? 1 - count / rows[i - 1][2] : null)} drop from the preceding step</p>` : ''}<div class="funnel-row"><div class="stage-label">${name}<small>${note}</small></div><div class="funnel-fill"><span style="width:${count / (s.mature || 1) * 100}%"></span></div><div class="funnel-total"><strong>${number(count)}</strong><small>${percent(s.mature ? count / s.mature : null)} of entrants</small></div></div>`).join('');
  const segmentRows = v.craft_segments.map((r) => `<tr><td>${r.craft}</td><td class="numeric">${number(r.entrants)}</td><td class="numeric">${number(r.mature)}</td><td class="numeric">${number(r.starts)}</td><td class="numeric">${percent(r.mature ? r.starts / r.mature : null)}</td></tr>`).join('');
  return `<div class="metric-note">${number(s.mature)} accounts have 14 days of follow-up. ${number(s.immature)} newer accounts are excluded from these outcome rates, rather than counted as failures.</div>` +
    panel('From first discovery to a recorded start', 'Ordered, account-level funnel within 14 days. Returning sessions count; each account appears once per step.', `<div class="funnel-rows">${body}</div>`) +
    `<div class="twocol equal">${panel('Saving is an optional branch', 'A diagnostic of the journey, not a required activation step.', `<div class="metrics" style="grid-template-columns:1fr 1fr;margin:15px 0 0">${metric('Saved within 14 days', number(s.saved), `${percent(s.mature ? s.saved / s.mature : null)} of mature entrants`)}${metric('Started without saving first', number(s.started - s.saved_then_started), `${percent(s.started ? (s.started - s.saved_then_started) / s.started : null)} of starters`)}</div>`)}<section class="insight"><span class="eyebrow">What I’d investigate</span><h2>What does an exit mean here?</h2><p>Someone might leave because nothing fits, because they need to check their yarn, or because they found what they wanted. The funnel tells me where to ask better questions. It doesn’t supply the answer on its own.</p><p>Recorded starts are useful, but I’d check whether a feature changes recording behaviour as well as making behaviour.</p></section></div>` +
    panel('Does the pattern hold across crafts?', 'Exploratory segmentation. Craft and experience differences are assumptions of this simulation, not findings about knitters or crocheters.', `<div class="table-wrap"><table><thead><tr><th>Craft</th><th class="numeric">Discovery accounts</th><th class="numeric">Mature accounts</th><th class="numeric">Recorded starts</th><th class="numeric">Start rate</th></tr></thead><tbody>${segmentRows}</tbody></table></div><p class="chart-note">Use the experience filter to inspect composition. A segment association isn’t a causal effect of being in that segment.</p>`);
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
    const style = cell.mature ? `background:rgba(112,84,140,${alpha});color:${cell.rate >= .38 ? '#fff' : '#514060'}` : '';
    const title = cell.mature ? `${dateLabel(c.cohort)} cohort, week ${col}: ${cell.numerator} of ${cell.denominator} accounts returned (${percent(cell.rate)})` : `${dateLabel(c.cohort)} cohort, week ${col}: full observation window has not elapsed`;
    return `<td><button class="cell${cell.mature ? '' : ' future'}" data-cell="${row},${col}" style="${style}" aria-label="${title}" title="${title}">${cell.mature ? percent(cell.rate, 0) : '—'}</button></td>`;
  }).join('')}</tr>`).join('');
  return `<div class="metrics">${metric('First-discovery cohorts', number(v.cohorts.length), 'Monday–Sunday calendar weeks')}${metric('Week 4 discovery retention', percent(s.retention4), `${number(s.retention4_n)} / ${number(s.retention4_eligible)} accounts observable`, 'retention', true)}${metric('Not yet observable at week 4', number(s.entrants - s.retention4_eligible), 'Kept out of the week 4 denominator')}${metric('Return means…', 'Discovery', 'A discovery view, pattern open, save or recorded start')}</div><div id="metric-explainer" hidden></div>` +
    panel('Retention by first-discovery cohort', 'Share with a qualifying event in that calendar week. Select a cell to inspect the numerator and denominator.', `<div class="table-wrap"><table class="cohort-table"><thead><tr><th>Cohort starts</th><th>Accounts</th>${Array.from({ length: 9 }, (_, i) => `<th>W${i}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><div class="cohort-key"><span class="sub">— means not yet observable, not zero retention. W0 is 100% by definition.</span><div class="scale">0% ${[.06, .25, .45, .65, .85].map((a) => `<i style="background:rgba(112,84,140,${a})"></i>`).join('')}60%+</div></div><div id="cohort-detail" class="cohort-detail">Each cell counts accounts once, even if someone visits several times that week.</div>`) +
    `<div class="twocol">${panel('The return curve', 'Weighted across cohorts with a complete window for each week.', lineChart(curve, [{ key: 'rate', label: 'Returned' }], { rate: true, label: 'Calendar-week discovery retention among observable cohorts' }) + '<p class="chart-note">Different weeks can contain different eligible cohorts. Use the heatmap to check whether the aggregate hides cohort changes.</p>')}<section class="insight"><span class="eyebrow">Context matters</span><h2>People don’t start a new project every week.</h2><p>I’d use discovery retention to understand whether this remains a useful place to come back to. I wouldn’t expect weekly project starts from everyone, or treat a quiet week as proof they stopped making things.</p><p>The useful next question is whether the return visit helps them do something they care about.</p></section></div>`;
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
    const y = 45 + i * 65, color = i ? '#c97552' : '#70548c';
    body += `<text x="${L - 15}" y="${y + 4}" text-anchor="end">${v.name}</text><line x1="${x(v.x.ci_low * 100)}" x2="${x(v.x.ci_high * 100)}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="3"/><circle cx="${x(v.x.difference * 100)}" cy="${y}" r="6" fill="${color}"><title>${v.name}: ${points(v.x.difference)}; 95% CI ${points(v.x.ci_low)} to ${points(v.x.ci_high)}</title></circle>`;
    for (const bound of [v.x.ci_low, v.x.ci_high]) body += `<line x1="${x(bound * 100)}" x2="${x(bound * 100)}" y1="${y - 6}" y2="${y + 6}" stroke="${color}" stroke-width="2"/>`;
  });
  body += `<text x="${(L + W - R) / 2}" y="184" text-anchor="middle">Treatment − control, percentage points · 95% Newcombe intervals</text>`;
  return svg(body, W, H, 'Simulated experiment effects with 95% confidence intervals');
}
function experiment() {
  const r = DATA.experiment[scenario], p = r.primary, g = r.abandonment_guardrail, planning = DATA.experiment.planning;
  const passed = r.decision.startsWith('meets');
  const criterion = (text, pass) => `<li><span>${text}</span><span class="${pass ? 'pass' : 'review'}">${pass ? 'Met' : 'Not met'}</span></li>`;
  return `<div class="scenario-toggle" role="group" aria-label="Synthetic experiment scenario"><button data-scenario="assumed_effect" class="${scenario === 'assumed_effect' ? 'active' : ''}" aria-pressed="${scenario === 'assumed_effect'}">Assumed effect</button><button data-scenario="null" class="${scenario === 'null' ? 'active' : ''}" aria-pressed="${scenario === 'null'}">No-effect scenario</button></div>` +
    `<div class="metric-note">Separate simulated experiment · 50/50 account-level assignment · full 14-day follow-up · this population is independent of the funnel and retention demo.</div>` +
    `<div class="metrics">${metric('Assigned accounts', number(r.assigned), `${number(p.control_n)} control · ${number(p.treatment_n)} treatment`)}${metric('Absolute effect on starts', points(p.difference), `95% CI ${points(p.ci_low)} to ${points(p.ci_high)}`, '', true)}${metric('Relative effect', percent(p.relative_lift), `Control ${percent(p.control_rate)} → treatment ${percent(p.treatment_rate)}`)}${metric('Sample-ratio check', r.srm_p.toFixed(3), 'p-value against 50/50 · flag below 0.001')}</div>` +
    `<div class="decision${passed ? '' : ' inconclusive'}"><strong>${passed ? 'Meets the illustrative decision criteria.' : 'Does not meet the illustrative decision criteria.'}</strong><p>${passed ? 'The primary estimate clears the practical threshold and the simulated abandonment interval stays inside the harm margin. I’d still need the other guardrails before a real launch decision.' : 'I wouldn’t call this a successful feature. The result does not establish a worthwhile increase in starts, and guardrail precision still matters.'} Both scenarios are generated assumptions, not Ravelry experiment results.</p></div>` +
    panel('How big is the effect, and how uncertain is it?', 'A positive start effect is desirable. A positive abandonment effect is harm. These need different interpretations.', intervalChart(p, g)) +
    `<div class="twocol equal">${panel('What I decided before looking', 'Fixed thresholds in code; not adjusted to make this result pass.', `<ul class="criteria-list">${criterion('Start-rate lower 95% bound above zero', p.ci_low > 0)}${criterion('Start-rate estimate at least +1 percentage point', p.difference >= .01)}${criterion('Abandonment upper 95% bound below +1 point', g.ci_high < .01)}${criterion('No SRM flag; all windows mature', r.srm_p >= .001 && r.immature === 0)}</ul><p class="chart-note">Primary two-proportion test p=${p.p_value.toFixed(4)}. Passing SRM and observed balance do not prove the implementation is correct.</p>`)}<section class="insight"><span class="eyebrow">Planning, not hindsight</span><h2>Would we be able to detect something useful?</h2><p>With an assumed 12% baseline and a +1.5-point effect, I’d need around <strong>${number(planning.required_total)}</strong> accounts for 80% power at a two-sided 5% significance level.</p><p>At 10,800 accounts per arm, the approximate minimum detectable effect is ${points(planning.mde_at_10800_per_arm)}. These are planning assumptions. A real baseline and marketplace dynamics could change the design.</p></section></div>` +
    panel('The checks I wouldn’t skip', 'One primary outcome, a fixed analysis horizon, and no treating repeated events as independent people.', `<div class="analysis-list" style="margin-bottom:0"><article class="analysis-item"><span class="number">01</span><h3>Follow-up and completeness</h3><p>${number(r.mature)} assignments have mature follow-up. The simulation assumes complete telemetry; event/outcome mismatches deliberately fail validation.</p></article><article class="analysis-item"><span class="number">02</span><h3>A null result is allowed</h3><p>Across ${DATA.experiment.null_calibration.repetitions} fixed-seed A/A checks, ${percent(DATA.experiment.null_calibration.false_positive_fraction)} reject a true null. I haven’t selected a seed to get a positive story.</p></article><article class="analysis-item"><span class="number">03</span><h3>The shared marketplace</h3><p>Maker attention and designer feedback are shared. A user-level test may not predict full rollout. Designer exposure and experience quality need real instrumentation; neither is simulated here.</p></article></div>`);
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
    `<div class="twocol equal">${panel('How much evidence sits behind a rating?', 'An unknown count stays unknown; it is not silently set to zero.', `<div class="mini-funnel">${evidence.map(([label, count], i) => `<div class="mini-stage" style="grid-template-columns:145px 1fr 35px"><span>${label}</span><div class="bar-track"><div style="width:${count / (r.length || 1) * 100}%;background:${i === 0 ? '#70548c' : '#9e89af'}"></div></div><strong>${number(count)}</strong></div>`).join('')}</div><p class="chart-note">I suppress averages without a positive known count in the analysis-ready quality fields. That limits a quality ranking, rather than supplying one.</p>`)}<section class="insight"><span class="eyebrow">What I take from this</span><h2>The totals leave me with questions.</h2><p>The top ${number(topN)} patterns account for ${percent(topShare)} of recorded projects in this selection. Age, visibility, metadata and the search itself could all contribute.</p><p>I’d use this to ask better questions about discovery and designer attention. It isn’t enough evidence to label a less-used pattern a hidden gem.</p></section></div>`;
}
function methods() {
  const duplicates = DATA.meta.received_events - DATA.meta.unique_events;
  const eventRows = [['discovery_viewed', 'A rendered discovery view', 'Starts the observational discovery cohort; not experiment assignment.'], ['pattern_opened', 'A pattern detail view', 'Allows an ordered funnel; repeated opens still count as one account.'], ['pattern_saved', 'A newly saved pattern', 'Optional branch; not required to start.'], ['project_started', 'A newly recorded in-progress project', 'Behavioural proxy for making, not evidence of actual making.']];
  return `<section class="panel readable"><span class="eyebrow">What I am trying to measure</span><div class="metric-tree"><div><strong>Feeling ready to start</strong><small>The underlying benefit. These events don’t directly observe confidence.</small></div><div><strong>A recorded project start</strong><small>A practical behavioural proxy, with a defined denominator and window.</small></div><div><strong>A useful return visit</strong><small>Discovery retention adds context; frequent making isn’t the expectation.</small></div></div><p class="sub">Designer exposure and experience quality belong alongside these outcomes in a real implementation. The catalogue and synthetic event stream cannot measure those guardrails here.</p></section>` +
    `<div class="method-grid"><section class="panel"><h2>The choices behind the metrics</h2><details open><summary>Why these denominators?</summary><p>The observational start rate uses first-discovery accounts with a full 14-day window. Funnel steps use that same denominator, ordered across sessions, for any pattern. This is distinct from the experiment’s intention-to-treat denominator: all assigned eligible accounts with mature follow-up.</p></details><details><summary>What counts as retention?</summary><p>A qualifying discovery, open, save or start event in a later Monday–Sunday calendar week. The cohort starts with first discovery, not signup. Each account counts once per week. W4 requires the entire fifth calendar week from the cohort’s start to have elapsed. Incomplete cells remain unobserved.</p></details><details><summary>What happens to duplicate events?</summary><p>The received stream includes ${number(duplicates)} deliberate transport retry copies with the same event_id. SQL keeps the earliest received copy. ${number(DATA.meta.received_events)} received rows become ${number(DATA.meta.unique_events)} business events before metrics are calculated.</p></details><details><summary>What can I infer from segments?</summary><p>Craft and experience rates are exploratory associations. The generator deliberately varies intent, experience and behaviour. Those assumptions are not discoveries about Ravelry’s users. They are useful for demonstrating composition checks and how I’d investigate a difference.</p></details></section><section class="panel"><h2>What’s real, and what I made up</h2><details open><summary>The product metrics are simulated</summary><p>A fixed seed generates 12,000 fictional accounts and an event stream over 16 weeks. Initial discovery, opens, saves, starts and declining return probabilities are explicit modelling assumptions. Intent links early use and later visits. This is not calibrated behavioural data and has complete telemetry by construction.</p></details><details><summary>The experiment is a separate simulation</summary><p>The seeded effect and null scenarios use their own assignments, events and assumptions. Their population does not change with the product-demo filters. Neither scenario establishes that the proposed feature works.</p></details><details><summary>The catalogue comes from Ravelry</summary><p>A five-pattern feasibility check preceded the bounded 50-pattern cowl search. I retained only the catalogue fields needed. Real records and derived payloads stay local; source code and synthetic aggregates are in the private repository. There is no evidence of real impressions, funnels or retention in the API snapshot.</p></details><details><summary>What would I do next?</summary><p>Audit the current discovery experience, watch makers choose a project, speak to designers, validate the recording proxy, and establish internal baselines. Then assess assignment, exposure, safety and shared-market interference before choosing a real test.</p></details></section></div>` +
    panel('From events to a metric I can defend', 'Python generator → DuckDB → dbt models and quality checks → aggregate JSON → this app.', `<div class="table-wrap"><table><thead><tr><th>Proposed event</th><th>Trigger</th><th>Why it is needed</th></tr></thead><tbody>${eventRows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="chart-note">The full proposed tracking plan adds account/session identity, timestamps, experiment assignment, schema versions and impression visibility rules. These names are a proposal, not a claim about existing Ravelry instrumentation.</p>`) +
    panel('Show me the SQL', 'These are the dbt models that produce the product journey and retention tables.', `<label for="sql-model" class="sr-only">SQL model</label><select id="sql-model">${Object.keys(DATA.sql).map((name) => `<option>${name}</option>`).join('')}</select><pre><code id="sql-code"></code></pre><a class="inline-link" href="https://github.com/stephanieboyle/ravelry-discovery-portfolio/tree/main/dbt_product" target="_blank" rel="noreferrer">Models, tests and definitions in the repository ↗</a>`);
}
function render() {
  page = Object.hasOwn(pages, location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  const [chapter, title, description] = pages[page];
  $('#chapter').textContent = chapter; $('#page-title').textContent = title; $('#page-description').textContent = description;
  document.title = `${title} · Stephanie Boyle`;
  const badge = $('#source-badge');
  badge.className = `source-badge${page === 'catalogue' ? ' real' : page === 'methods' ? ' mixed' : ''}`;
  badge.textContent = page === 'catalogue' ? 'REAL API · PRIVATE LOCAL SNAPSHOT' : page === 'methods' ? 'SOURCES & DEFINITIONS' : 'SIMULATED PRODUCT EVENTS';
  $('#filters').hidden = !['overview', 'funnel', 'retention'].includes(page);
  const selectedCohorts = slice().cohorts;
  $('.filter-end > span').textContent = selectedCohorts.length ? `${dateLabel(selectedCohorts[0].cohort)}–25 Oct 2026` : 'No selected cohorts';
  document.querySelectorAll('nav a').forEach((a) => { a.classList.toggle('active', a.dataset.page === page); if (a.dataset.page === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#content').innerHTML = ({ overview, funnel, retention, experiment, catalogue, methods })[page]();
  document.querySelectorAll('[data-definition]').forEach((b) => b.addEventListener('click', () => {
    const target = $('#metric-explainer'); target.textContent = defs[b.dataset.definition]; target.hidden = false;
  }));
  document.querySelectorAll('[data-scenario]').forEach((b) => b.addEventListener('click', () => { scenario = b.dataset.scenario; render(); }));
  document.querySelectorAll('[data-cell]').forEach((b) => b.addEventListener('click', () => {
    const [r, c] = b.dataset.cell.split(',').map(Number), cohort = slice().cohorts[r], cell = cohort.cells[c];
    document.querySelectorAll('[data-cell]').forEach((v) => v.classList.remove('selected')); b.classList.add('selected');
    $('#cohort-detail').textContent = cell.mature ? `${dateLabel(cohort.cohort)} cohort · week ${c}: ${number(cell.numerator)} of ${number(cell.denominator)} accounts had a qualifying event (${percent(cell.rate)}). Calendar-week retention, not a rolling-day measure.` : `${dateLabel(cohort.cohort)} cohort · week ${c}: the entire observation week has not elapsed by 26 October. There is no retention estimate for this cell yet.`;
  }));
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
