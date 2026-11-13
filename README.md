# Arduino Roadmap

Website that shows a full roadmap of the whole Arduino history, from it's early prototypes, to it's final versions.

## GitHub Pages deployment

1. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Merge the deployment workflow into `main`. Pushes to `main` automatically build and deploy the site.
3. You can also run **Deploy to GitHub Pages** manually from the **Actions** tab after the workflow is on the default branch.

The workflow uses Node.js 22, installs dependencies with `npm ci`, builds the Vite site with the base path supplied by GitHub Pages, and deploys the `dist` directory.

The default project URL is https://havaianasdestruido.github.io/arduino-roadmap/.
