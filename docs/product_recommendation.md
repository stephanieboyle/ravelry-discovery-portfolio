# Product recommendation: help makers judge suitability

Private portfolio exercise; independent of Ravelry. This recommendation separates real catalogue diagnostics, product hypotheses and synthetic experiment results. It is a proposal for research and testing, not evidence that a feature will work.

## Problem and evidence

The working problem is uncertainty between finding an attractive pattern and deciding to start it. A maker may need to judge skills, materials and the strength of other makers' feedback. The cost of a poor choice can include unused materials, frustration and time. Designers may lose suitable makers if their patterns are difficult to assess, while established patterns can dominate reassurance signals.

Ravelry already offers substantial discovery functionality. Official help describes advanced filters, comparison and stash-related suggestions. The current logged-in end-to-end journey has not been audited, so a new feature gap has not been established. Start with that audit and observed maker sessions, rather than assuming another recommendation surface is needed.

The real API study describes a bounded text-search sample. Its [private findings](../reports/private/findings.md) and metrics.json show activity concentration, publication-age context and rating-count coverage. These diagnostics demonstrate why popularity and average ratings need care. They cannot explain why activity is concentrated or which patterns received impressions. Catalogue dates, craft composition, search selection and missing evidence all limit interpretation. No pattern is classified as a hidden gem or low exposure, and no finding estimates actual starts or discovery conversion.

## Proposed action

Prototype a small suitability summary inside existing results or comparison: the craft/material preferences a result matches, relevant requirements that remain unknown, and the amount of evidence behind feedback. Treat “achievable” as an individual's assessment, not a universal score. Avoid penalising a new designer merely because few people have rated a pattern. Give makers control over their preferences and an easy route to the existing detailed information.

First, watch makers complete a realistic choice using today's interface. Include people with different crafts and levels of experience, with and without an intended material constraint. Check whether the uncertainty is real, whether existing functionality solves it, and whether labels are understood. Ask designers what constitutes meaningful discovery and where inaccurate suitability claims might harm them. If the existing flow already handles the problem, improve its explanation or discoverability instead of adding another surface.

## Measurement and experiment

If research supports the intervention, instrument assignment, visible impressions, opens, saves and newly recorded in-progress projects. Define impressions with a visibility-duration threshold and deduplicate transport retries. Persist account-level assignment across devices. A render failure does not remove an assigned account from intention-to-treat analysis.

The primary outcome is the share of assigned eligible accounts recording a new project within 14 days. It is a proxy: makers can start without recording, or change recording behaviour after seeing a new feature. Keep recording opportunities equivalent between arms and gather voluntary follow-up evidence of actual making. Count each assigned account once and wait for complete follow-up plus ingestion time.

Predefine the smallest worthwhile lift, duration/sample size and decision rule using actual baseline data. The separate [simulation](experiment_design.md) illustrates planning and inference under explicit assumptions; its results do not predict Ravelry's effect. The implemented rule requires a positive primary interval, a practically meaningful estimate, valid telemetry and an abandonment interval excluding material harm. Designer exposure, popularity concentration and experience quality are additional proposed launch guardrails; they are not fabricated in the synthetic dataset and must be measured in a real test.

## Marketplace trade-offs and decision

More starts alone could hide a less healthy ecosystem if attention narrows towards established designers or results steer makers into unsuitable projects. Monitor exposure across a fixed eligible designer set and distinguish catalogue coverage from user relevance. Aggregate designer shares are not independent impression observations. Predefine tolerable harm with stakeholders rather than choosing a threshold after seeing results.

For a limited interface trial, user-level assignment may be practical because many makers can use the same pattern. Still, reviews, recommendation feedback and designer attention are shared. Consider clusters or switchbacks only if a credible interference mechanism outweighs their lower power, overlap and carry-over costs. A mixed-allocation result may differ from full rollout.

The current recommendation is to validate the uncertainty problem and its explanation, then run a bounded test if supported. Do not launch a quality score from this catalogue sample. Next evidence: current-journey research, verified count/scale semantics, a broader permitted sampling frame, reliable internal baseline/latency data and an interference assessment. Public release of any API-derived results needs its own terms review; this private build is not evidence of publication permission.
