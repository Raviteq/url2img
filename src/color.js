// color.js - Simple color handling for PhantomJS
// Inspiration: https://github.com/ket4yii/phantomjs-chalk

// define colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  crimson: "\x1b[38m",

  bgblack: "\x1b[40m",
  bgred: "\x1b[41m",
  bggreen: "\x1b[42m",
  bgyellow: "\x1b[43m",
  bgblue: "\x1b[44m",
  bgmagenta: "\x1b[45m",
  bgcyan: "\x1b[46m",
  bgwhite: "\x1b[47m",
  bgcrimson: "\x1b[48m"
};

// define color functions
exports.dim = function(str) {
  return colors.dim + str + colors.reset;
}
exports.blink = function(str) {
  return colors.blink + str + colors.reset;
}
exports.underscore = function(str) {
  return colors.underscore + str + colors.reset;
}
exports.reverse = function(str) {
  return colors.reverse + str + colors.reset;
}
exports.black = function(str) {
  return colors.black + str + colors.reset;
}
exports.red = function(str) {
  return colors.red + str + colors.reset;
}
exports.green = function(str) {
  return colors.green + str + colors.reset;
}
exports.yellow = function(str) {
  return colors.yellow + str + colors.reset;
}
exports.blue = function(str) {
  return colors.blue + str + colors.reset;
}
exports.magenta = function(str) {
  return colors.magenta + str + colors.reset;
}
exports.cyan = function(str) {
  return colors.cyan + str + colors.reset;
}
exports.white = function(str) {
  return colors.white + str + colors.reset;
}
exports.crimson = function(str) {
  return colors.crimson + str + colors.reset;
}
exports.color = function(str, color) {
  if(!color) color = 'bright';
  console.log(colors[color] + str + colors.reset);
}