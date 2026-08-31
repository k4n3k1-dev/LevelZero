import { defineConfig } from 'vite';

// base: './' makes every asset URL relative to index.html itself,
// rather than relative to the domain root. This matters because the
// built game will be served from a subdirectory in TWO different
// places during this project:
//
//   - GitHub Pages:  https://<user>.github.io/<repo>/
//   - LAMP server:   https://<server>/<your-group-folder>/
//
// Neither of those is the root of the domain. If any path in the code
// starts with a leading "/", it resolves to the domain root instead of
// your subdirectory, and you get a blank page with 404s in the console
// once hosted (works fine on `npm run dev` because dev serves from the
// root, which is exactly why this bites people late, not early).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
});
