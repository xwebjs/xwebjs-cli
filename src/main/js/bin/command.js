const pack = require('../features/pack')
const publish = require('../features/publish')
const program = require('commander')
const didYouMean = require('didyoumean')
// Setting edit distance to 60% of the input string's length
didYouMean.threshold = 0.6

program
.command('package')
.action(
  function () {
    console.log('calling package command')
    pack()
  }
)
program
.command('publish')
.action(
  function () {
    console.log('calling publish command')
    publish()
  }
)
program.parse(process.argv)



