# The Value of Zero

An interactive website for the paper *The Value of Zero: A Positional Measure
of What a Zero Digit Contributes to a Number* by Sanket Santosh Vidya Manohar.

Type any number and see exactly how much its zeros are worth, with simple
explanations of every rule in the paper and worked examples.

- Paper DOI: https://doi.org/10.5281/zenodo.23641598
- ORCID: https://orcid.org/0009-0006-6912-3107
- Website: https://sanketmanohar.com/

## Updating the paper

Replace `paper/value-of-zero-paper.pdf` with the latest version (same file
name) and push. The site redeploys automatically.

## How it is built

Plain HTML, CSS and JavaScript with no build step:

- `index.html`: page structure and text
- `assets/style.css`: layout and design
- `assets/app.js`: calculator and interactive examples
- `paper/`: the current paper (PDF and LaTeX source)

Every push to `main` deploys to GitHub Pages through
`.github/workflows/pages.yml`. In the repository settings, under
**Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.

To preview locally, run `python3 -m http.server` in this folder and open
http://localhost:8000.
