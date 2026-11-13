# Interview notes

## The argument I would lead with

I framed a product decision before choosing an analysis: can discovery help people judge whether a pattern is suitable, while supporting designers? I checked existing functionality and the API, inspected a small sample, then adapted the analysis to what the fields actually supported. The useful judgement was to limit a quality-ranking claim when denominators and exposure were unavailable. I can show the private findings separately from the reproducible synthetic experiment.

## Why these metrics?

A newly recorded in-progress project is closer to the intended benefit than clicks or saves, but it remains a proxy for making. I chose assigned eligible accounts as the denominator to avoid selecting only people who engaged with treatment. The 14-day window is a proposed decision horizon, not a data-derived optimum. It balances delayed decisions with operational speed and needs validation using internal baselines. Materially different project cycles may warrant a different window before the test starts.

Abandonment checks whether extra explanation creates friction. Experience quality checks whether recorded starts came at the cost of poor choices, although survey response can itself change by arm. Designer and popularity exposure guardrails address how attention is distributed, not just aggregate activity. They require actual impressions; catalogue project totals cannot substitute for them.

## Why this experiment?

Account-level randomisation aligns the unit with the primary outcome, is implementable and supports intention to treat. Mature windows avoid coding late starters as failures. SRM is a diagnostic for allocation/logging problems, and observed covariate balance is a diagnostic of some observed differences; neither proves correct randomisation. I use one primary outcome, confidence intervals and a practical threshold. I do not claim “no harm” because a guardrail p-value is large.

I fixed the seed and assumptions, reported both assumed-effect and null scenarios, and checked repeated A/A behaviour instead of selecting a favourable result. The simulation has complete telemetry by construction. Validation catches several injected failures but cannot establish that hypothetical real event tracking would be complete. There are no observed network effects in the simulation.

## Most important limits

The bounded cowl search is a convenience sample with unspecified ordering and moving pagination. It is not representative. Counts are present-day totals across potentially different users and periods. Missing counts are unknown, not zero, and averages without evidence counts are insufficient for a quality label. Publication dates are not necessarily platform age. No impressions, sessions, eligible user counts, assignment or causal outcomes come from this public-data study. A current UI audit and maker research remain necessary.

I deliberately did not calculate a favourites-to-project conversion rate, infer low exposure from low activity, reconstruct a history, or rank designers by an arbitrary opportunity score. A larger convenience sample would not fix the selection mechanism.

## Transfer to a dating product

The transferable reasoning is to define the beneficial behaviour, distinguish logged proxies from the underlying experience, and account for effects on other participants. More profile opens or messages need not mean better connections; response quality, consent, safety and unequal attention matter. Assignment and exposure differ, and shared participants can create interference, making user-level estimates dependent on the market's treatment mix.

The domains also differ. A pattern is reusable by many makers; a person's time, attention, preferences and consent are constrained and reciprocal. A dating connection requires mutual interest, and sensitive personal data and safety concerns need specific expertise. Designer attention is a useful analogue for distributional trade-offs, not evidence that I have professional dating-marketplace experience. I would explain the transfer in terms of measurement and experimental judgement, and ask domain experts about the mechanisms and safeguards.

## If challenged on the decision

Why not build a recommender? Because metadata and count uncertainty do not establish the need or supply exposure labels. Why not call it success after the synthetic lift? Because the effect is an input assumption and random variation, not an empirical finding. What would change my recommendation? Current-flow evidence that uncertainty is already resolved, poor comprehension of the summary, inadequate metadata or a real experiment with inconclusive benefit or material ecosystem harm.

## The additional analyses I would discuss

I compared week-four return by activation status using a day-14 landmark, then standardised craft and experience to a common mix. Fixing the ordering avoids letting the return window define the activation group. It still does not make the gap causal: intent is unobserved and the grouping is behavioural.

For designer attention I added an explicitly synthetic exposure model, using the existing assignment unit for bootstrap resampling. The stress case can block the numerical review despite a positive primary result. I would distinguish this later sensitivity from the original primary/abandonment protocol, and would not claim it proves interference or network effects.

The opportunity view uses eligible accounts × assumed coverage × absolute lift. Its range is a planning scenario, not an empirical forecast or a confidence interval. Targeting new-to-craft makers is a proposed research focus rather than a claim that the feature has a measured segment-specific effect.
