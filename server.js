/**
 * @fileoverview Server entry point for Campus Pulse.
 */

const app = require("./app");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Campus Pulse running on http://localhost:${PORT}`);
});

module.exports = server;
