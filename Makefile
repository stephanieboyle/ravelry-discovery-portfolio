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

.PHONY: product-data product-model app-export app-data app
product-data:
	$(PYTHON) -m ravelry_analytics.simulate_product
product-model:
	cd dbt_product && ../.venv/bin/dbt build --profiles-dir . --no-use-colors --no-send-anonymous-usage-stats
app-export:
	$(PYTHON) -m ravelry_analytics.export_dashboard
app-data: product-data product-model simulate experiment app-export
app:
	$(PYTHON) -m http.server 8765 --bind 127.0.0.1 --directory dashboard
