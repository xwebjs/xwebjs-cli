const pack = require('../../src/main/js/features/pack')
const fsExtra = require('fs-extra')
const fs = require('fs')
const _ = require('lodash')

const targetFolder = 'target/main/js/'

describe('Test packaging', function () {

  function checkFileName (moduleName, versionName) {
    return fsExtra.pathExistsSync(targetFolder + moduleName + '-' + versionName + '.xlib')
  }

  function checkModuleSectionInfo (moduleName, versionName, moduleHeaderInfos) {
    let fileContent = fs.readFileSync(targetFolder + moduleName + '-' + versionName + '.xlib', 'utf8')
    return _.every(
      moduleHeaderInfos,
      function (moduleHeaderInfo) {
        return fileContent.includes(moduleHeaderInfo)
      }
    )
  }

  it('With multiple folders', function (done) {
    pack('./test/spec/test1').then(
      function () {
        expect(checkFileName('app', '1.0')).toBe(true)
        expect(checkModuleSectionInfo(
          'app', '1.0',
          ['p#a;m#A', 'p#b;m#B', 'p#b.c;m#C', 'p#b.c;m#D']
        )).toBe(true)
        done()
      },
      function (error) {
        fail('Failed:' + error)
      }
    )
  })
})
