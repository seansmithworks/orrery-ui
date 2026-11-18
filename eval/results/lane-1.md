# Eval run lane1

27 scored runs. Scores are 0..1; each cell is the mean over its runs (n in brackets). Total = mean of the five scorers.

## Total, scenario by ablation

| scenario | full | -design | -catalog | -rules | floor |
|---|---|---|---|---|---|
| confirm-delete | 1.00 (3) | 1.00 (1) | 1.00 (1) | 1.00 (1) | 1.00 (3) |
| crew-tabs | 1.00 (3) | 1.00 (1) | 1.00 (1) | 1.00 (1) | 1.00 (3) |
| profile-settings | 1.00 (3) | 1.00 (1) | 0.80 (1) | 1.00 (1) | 0.80 (3) |
| **all** | **1.00** (9) | **1.00** (3) | **0.93** (3) | **1.00** (3) | **0.93** (9) |

## By scorer, ablation by scorer (all scenarios)

| ablation | kit-only | literals | typecheck | catalog | render | total |
|---|---|---|---|---|---|---|
| full | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| -design | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| -catalog | 1.00 | 1.00 | 1.00 | 1.00 | 0.67 | 0.93 |
| -rules | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| floor | 1.00 | 1.00 | 1.00 | 1.00 | 0.67 | 0.93 |

## Every run

| run | kit-only | literals | typecheck | catalog | render | total | turns | cost USD |
|---|---|---|---|---|---|---|---|---|
| confirm-delete__-catalog__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 0.070 |
| confirm-delete__-design__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 0.054 |
| confirm-delete__-rules__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 0.055 |
| confirm-delete__floor__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 0.046 |
| confirm-delete__floor__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 0.045 |
| confirm-delete__floor__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 0.046 |
| confirm-delete__full__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 0.080 |
| confirm-delete__full__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 0.076 |
| confirm-delete__full__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 0.078 |
| crew-tabs__-catalog__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 0.067 |
| crew-tabs__-design__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 0.040 |
| crew-tabs__-rules__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 9 | 0.057 |
| crew-tabs__floor__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 0.044 |
| crew-tabs__floor__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 0.044 |
| crew-tabs__floor__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 0.044 |
| crew-tabs__full__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 9 | 0.058 |
| crew-tabs__full__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 0.064 |
| crew-tabs__full__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 0.063 |
| profile-settings__-catalog__1 | 1.00 | 1.00 | 1.00 | 1.00 | 0.00 | 0.80 | 10 | 0.134 |
| profile-settings__-design__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 0.053 |
| profile-settings__-rules__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 11 | 0.111 |
| profile-settings__floor__1 | 1.00 | 1.00 | 1.00 | 1.00 | 0.00 | 0.80 | 8 | 0.076 |
| profile-settings__floor__2 | 1.00 | 1.00 | 1.00 | 1.00 | 0.00 | 0.80 | 8 | 0.075 |
| profile-settings__floor__3 | 1.00 | 1.00 | 1.00 | 1.00 | 0.00 | 0.80 | 8 | 0.075 |
| profile-settings__full__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 9 | 0.075 |
| profile-settings__full__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 11 | 0.112 |
| profile-settings__full__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 11 | 0.113 |

Subscription auth: cost shown is the CLI's own estimate (1.86 USD across the run), not a bill.

## First failure detail per failing scorer

- profile-settings__-catalog__1 / render: orrery-light: axe target-size (serious): 1 node(s), e.g. #ui-sdk-_r_4_-control
- profile-settings__floor__1 / render: orrery-light: axe target-size (serious): 1 node(s), e.g. #ui-sdk-_r_4_-control
- profile-settings__floor__2 / render: orrery-light: axe target-size (serious): 1 node(s), e.g. #ui-sdk-_r_4_-control
- profile-settings__floor__3 / render: orrery-light: axe target-size (serious): 1 node(s), e.g. #ui-sdk-_r_4_-control

## Reading

Lane 1 is a ceiling-limited result: 23 of 27 runs scored 1.00, so only one effect shows. Removing the catalog and golden examples (`-catalog`, `floor`) costs profile-settings its render score in all 4 runs (axe `target-size`: the agent laid the controls out with no spacing tokens, so they touch). The golden examples teach token-spaced layout, which no code scorer other than render and axe sees. `-design` and `-rules` show no effect, as predicted: DESIGN.md covers Iris only, and the agent cannot run the source checker (file tools only), so the registry reaches it as text. Sonnet reads kit source well enough that kit-only, typecheck and catalog scores stay at 1.00 even at floor, so the three scenarios are too easy to separate the files on those scorers. n is 1 for single-ablation cells; do not read a 0.00 difference there as proof of no effect.
