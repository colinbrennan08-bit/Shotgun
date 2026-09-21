/**
 * Extends app.json at build time.
 *
 * GitHub Pages serves a project site from a subpath (`/<repo>/`, not `/`), so a
 * web build made for the root asks for `/_expo/...` and gets 404s: a blank page
 * with no visible error. `experiments.baseUrl` rewrites those paths.
 *
 * It is set from an env var rather than hardcoded so the repo can be renamed, or
 * forked, without editing config, and so local dev is untouched: when
 * EXPO_BASE_URL is unset the app builds for the root exactly as before. The
 * deploy workflow fills it in from the repository name.
 */
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
