// Suppress DEP0108: xlsx@0.18.5 accesses zlib.bytesRead for feature detection.
// The package still works correctly; there is no newer free version of xlsx.
const _emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...args) => {
  // args signature: (msg, type, code, fn) → code is args[1]
  if (args[1] === 'DEP0108') return;
  _emitWarning(warning, ...args);
};

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
