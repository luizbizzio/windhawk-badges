# Contributing to Windhawk Badges

Use Node.js 22 or newer and Python 3.12 or newer. Run `npm install`, `npm test`, and `python -m unittest discover -s tests -p 'test_*.py'`. Use `npm run dev` for a local Worker. The generator is [`scripts/generate.py`](scripts/generate.py) and the Worker entry point is [`worker/index.js`](worker/index.js).

## Review a change

- Use the [sample catalog](tests/sample-catalog.json) to exercise new badge values and missing or invalid mod IDs.
- Check the resulting SVG's text, dimensions, and escaping. For query changes, compare supported style parameters and invalid input handling.
- For site changes, verify the live preview and the Markdown that a user copies. For Worker or generator changes, check that equivalent inputs produce consistent badges where both are supported.

Include a sample badge URL, a before and after preview for visual changes, and the tests you ran.
