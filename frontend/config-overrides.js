// Webpack config override for Create React App
// This silences the Plotly source map warning
module.exports = function override(config) {
  // Silence Plotly source map warning
  config.ignoreWarnings = config.ignoreWarnings || [];
  config.ignoreWarnings.push(/Failed to parse source map.*maplibre-gl-unminified\.js\.map/);
  return config;
};








