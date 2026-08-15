# Contributing

Use synthetic documents only. Do not add confidential contracts, credentials, personal data, generated databases, or upload artifacts.

Every detector change must include an annotated evaluation case and a regression test. Every new model strategy must preserve exact evidence locations and make its limitations explicit.

Run the complete validation before opening a pull request:

```bash
make test
make evaluate
```
