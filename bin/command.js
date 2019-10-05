#!/usr/bin/env node
const package = require('../libs/package')
const program = require('commander')
const didYouMean = require('didyoumean')

// Setting edit distance to 60% of the input string's length
didYouMean.threshold = 0.6

program
.command('package')
.action(
  function () {
    package()
  }
)
program.parse(process.argv)



