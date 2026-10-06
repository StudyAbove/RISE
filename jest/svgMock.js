// Jest can't load SVG files, so every `.svg` import becomes this empty
// component in tests (mapped in the "jest" section of package.json).
const { View } = require('react-native');

module.exports = View;
