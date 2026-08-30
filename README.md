# CGV Project — [Game Title Here]

COMS3006A / COMS3025A Computer Graphics and Visualisation group project.
A 3D browser game built with [Three.js](https://threejs.org/).

**Team:** [names here]
**Live preview (GitHub Pages):** https://<your-username>.github.io/<your-repo>/

---

## 1. One-time setup

You need [Node.js](https://nodejs.org/) (LTS version) installed. Then, from the project root:

```bash
npm install
```

This reads `package.json` and downloads Three.js and Vite into `node_modules/`
(that folder is git-ignored — never commit it).

## 2. Day-to-day development

```bash
npm run dev
```

Starts a local dev server (usually `http://localhost:5173`) with hot-reload —
edit a file, save, see the change instantly in the browser. This is what
everyone on the team should use while actively working on the game.

## 3. Project structure

```
index.html          entry point — loading screen, HUD, credits overlay
src/
  main.js            Three.js bootstrap: scene, camera, renderer, render loop
  style.css           loading screen / HUD / credits styling
  scenes/             (create this) one module per level
  entities/           (create this) Player, Enemy, etc.
  shaders/            (create this) your custom .glsl vertex/fragment shaders
  systems/             (create this) input handling, XP/leveling, audio, etc.
public/
  models/              .glb/.gltf 3D models go here
  textures/             image assets go here
  audio/                sound effects / music go here
vite.config.js         build config — base: './' is load-bearing, see below
.github/workflows/
  deploy.yml            auto-deploys to GitHub Pages on every push to main
```

Anything placed in `public/` is copied as-is into the build output and
referenced with a path relative to the site root, e.g. a file at
`public/models/knight.glb` is loaded in code as `./models/knight.glb`.

## 4. The most important rule in this codebase: relative paths only

This project will be hosted from a **subdirectory** in two different
places — GitHub Pages (`<user>.github.io/<repo>/`) and the department LAMP
server (`<server>/<group-folder>/`) — never from the root of a domain.

**Never write a path starting with `/`.** Always use `./` or a relative
path. `vite.config.js` is already configured with `base: './'` to support
this, and it's the single biggest cause of "it works on my machine but
shows a blank page once hosted" — see section 6.2 of the project brief.

Also: the LAMP server runs Linux, which is case-sensitive about filenames.
Keep every asset filename lowercase, hyphen-separated, no spaces
(`sword-hero.glb`, not `Sword_Hero.GLB`), and make sure the code references
match exactly.

## 5. Deploying

### GitHub Pages (team preview / showing your mentor)

Automatic — every push to `main` triggers `.github/workflows/deploy.yml`,
which runs `npm run build` and publishes the result. The only one-time
setup needed is in the repo's **Settings → Pages → Source**, set to
"GitHub Actions".

### LAMP server (the actual graded submission — see brief §5)

GitHub Pages is *not* the graded deliverable. For Alpha/Beta/Final:

```bash
npm run build        # writes a self-contained build into dist/
npx serve dist        # serve the BUILD locally and click through it —
                       # do this every time, it catches problems the
                       # dev server hides
```

Then zip the **contents** of `dist/` (not the `dist` folder itself —
`index.html` must sit at the top level of the archive) and upload via
the Moodle submission link.

## 6. Credits

Every asset, library, tutorial, or code sample you didn't make yourselves
must be listed in-game (see the credits screen in `index.html`) **and**
below, with source and licence:

| What | Source | Licence |
|---|---|---|
| Three.js | https://threejs.org/ | MIT |
| | | |

## 7. Team contribution notes

Since individual marks can be adjusted based on the Moodle contribution
report, it's worth keeping rough notes here (or in GitHub Issues/Projects)
of who owns what, updated as you go rather than reconstructed at the end:

- Level 1: —
- Level 2: —
- Level 3: —
- Shaders: —
- Player/combat systems: —
- Trailer/devlog: —
