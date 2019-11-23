// const pack = require('../../src/main/js/features/pack')
const fsExtra = require('fs-extra')
const fs = require('fs')
const _ = require('lodash')
const { exec } = require('child_process')

const targetFolder = 'target/main/js/'

describe('Test packaging', function () {

  beforeEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
  })

  function checkFileName (testFolder, moduleName, versionName) {
    return fsExtra.pathExistsSync(testFolder + targetFolder + moduleName + '-' + versionName + '.xlib')
  }

  function checkModuleSectionInfo (testFolder, moduleName, versionName, moduleHeaderInfos) {
    let fileContent = fs.readFileSync(testFolder + targetFolder + moduleName + '-' + versionName + '.xlib', 'utf8')
    return _.every(
      moduleHeaderInfos,
      function (moduleHeaderInfo) {
        return fileContent.includes(moduleHeaderInfo)
      }
    )
  }
  it('With no module', function (done) {
    exec('node ../../../src/main/js/bin/command.js package', { cwd: 'test/spec/test3' },
      function (error, stdout, stdErr) {
        expect(stdErr).toEqual(jasmine.stringMatching('No module file found'))
        done()
      },
      function (error) {
        fail('Failed:' + error)
      }
    )
  })
  it('With one module file only', function (done) {
    exec('node ../../../src/main/js/bin/command.js package', { cwd: 'test/spec/test2' },
      function (error, stdout, stdErr) {
        expect(checkFileName(
          'test/spec/test2/', 'app', '1.0')
        ).toBe(true)
        expect(checkModuleSectionInfo(
          'test/spec/test2/',
          'app', '1.0',
          ['p#;m#A']
        )).toBe(true)
        done()
      },
      function (error) {
        fail('Failed:' + error)
      }
    )
  })
  it('With multiple folders', function (done) {
    exec('node ../../../src/main/js/bin/command.js package', { cwd: 'test/spec/test1' },
      function (error, stdout, stdErr) {
        expect(checkFileName(
          'test/spec/test1/','app', '1.0')
        ).toBe(true)
        expect(checkModuleSectionInfo(
          'test/spec/test1/',
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
