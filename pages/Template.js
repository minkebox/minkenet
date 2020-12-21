
const FS = require('fs');
const Glob = require('fast-glob');
const Handlebars = require('handlebars');

const Template = {};
function loadTemplates() {
  Glob.sync([ `**.html` ], { cwd: __dirname }).forEach(template => {
    const name = template.replace(/\//g, '').replace(/\.html$/, '');
    const func = Handlebars.compile(FS.readFileSync(`${__dirname}/${template}`, { encoding: 'utf8' }));
    Template[name] = ctx => {
      return func(ctx, {
        allowProtoMethodsByDefault: true,
        allowProtoPropertiesByDefault: true
      });
    }
    Handlebars.registerPartial(name, Template[name]);
  });
}
Template.load = loadTemplates;

Handlebars.registerHelper({
  print: function() {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    console.log(args);
  },
  eq: function (v1, v2) {
    return v1 == v2;
  },
  ne: function (v1, v2) {
    return v1 != v2;
  },
  lt: function (v1, v2) {
    return v1 < v2;
  },
  gt: function (v1, v2) {
    return v1 > v2;
  },
  lte: function (v1, v2) {
    return v1 <= v2;
  },
  gte: function (v1, v2) {
    return v1 >= v2;
  },
  and: function () {
    return Array.prototype.slice.call(arguments).every(Boolean);
  },
  or: function () {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  },
  not: function(v) {
    return !v;
  },
  add: function(v1, v2) {
    return v1 + v2;
  },
  sub: function(v1, v2) {
    return v1 - v2;
  },
  mul: function(v1, v2) {
    return v1 * v2;
  },
  div: function(v1, v2) {
    return v1 / v2;
  },
  mod: function(v1, v2) {
    return v1 % v2;
  },
  fixed: function(v, f) {
    return Number(Number(v).toFixed(f)).toLocaleString();
  },
  array: function() {
    return Array.prototype.slice.call(arguments, 0, -1);
  },
  isdefined: function(v) {
    return v !== undefined && v !== null;
  },
  concat: function() {
    return String.prototype.concat.apply("", Array.prototype.slice.call(arguments, 0, -1));
  },
  date: function(d) {
    return new Date(d).toDateString()
  },
  now: function() {
    return Date.now();
  }
});

module.exports = Template;
