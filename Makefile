PYTHON := .venv/bin/python
export MPLCONFIGDIR := $(CURDIR)/.cache/matplotlib
export PYTHONPATH := $(CURDIR)/src
export DO_NOT_TRACK := 1

.PHONY: collect model catalogue simulate experiment test offline
collect:
	$(PYTHON) -m ravelry_analytics.collect --limit 5 --private-use
model:
	cd dbt && ../.venv/bin/dbt build --profiles-dir . --no-use-colors --no-send-anonymous-usage-stats
catalogue:
	$(PYTHON) -m ravelry_analytics.analyse_catalogue
simulate:
	$(PYTHON) -m ravelry_analytics.simulate_experiment
experiment:
	$(PYTHON) -m ravelry_analytics.analyse_experiment
test:
	$(PYTHON) -m pytest -q
offline: simulate experiment test
