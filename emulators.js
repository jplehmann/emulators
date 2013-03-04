#!/usr/bin/env node

/**
 * Emulators.js is a utility to help manage an array of
 * Android emulators and installed applications.
 */

var exec = require('child_process').exec;
var fs = require('fs'),
    spawn = require('child_process').spawn
var assert = require('assert');

var program = require('commander');
var _ = require('underscore');

var REALLY_EXECUTE = true;

//first, checks if it isn't implemented yet
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

/**
 * Wraps system execute calls, primarily for mocking.
 */
function System() {
  /**
   * @cmd the command to run
   * @next function to run synchronously after command
   */
  this.exec = function(cmd, next) {
    console.log("Executing: " + cmd);
    if (REALLY_EXECUTE) {
      var child = exec(cmd,
        function (error, stdout, stderr) {
          if (error !== null) {
            console.log('exec error: ' + error);
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
          } else {
            console.log("Done executing: " + cmd);
          }
          // chain to the next bit logic synchronously
          if (next !== undefined) {
            next();
          }
        });
    }
    return 0;
  };
  /**
   * Execute this command and detach from it.
   */
  this.execDetached = function(cmd) {
    var cmdArray = cmd.trim().split(' ');
    console.log(cmdArray);
    var child = spawn(cmdArray[0], cmdArray.slice(1), {
      detached: true,
      // TODO: direct these to a file in /tmp
      stdio: [ 'ignore', process.stdout, process.stderr]
    });
    child.unref();
    console.log("done executing");
  };
}

/** Global "system" object */
var sys = new System();

/**
 * We restart ABD because it is very finicky.
 *
 * @next is callback function to run when complete.
 */
function restartAdb(next) {
  console.log("Restarting adb.");
  sys.exec("adb kill-server", function() {
    sys.exec("adb start-server", function() {
      console.log("Restart of adb complete.");
      if (next !== undefined) {
        next();
      }
    });
  });
}

/**
 * A configured emulator, which may not be started.
 */
function Emulator(id, options) {
  this.id = id;
  //this.options = options;
  this.serial = options.serial;
  this.name = options.name;
  this.port = this.serial.substring(9);

  /** Emulator only commands. */
  this.emuStart = function(visual) {
    // TODO: try up to 3 times to start the emulator
    // TODO: create a unique outfile
    var outfile = "/tmp/" + this.serial
    //var cmdStart = "nohup emulator -avd {0} -port {1}".format(this.name, this.port);
    var cmdStart = "emulator -avd {0} -port {1}".format(this.name, this.port);
    // TODO: redirect output to logfile
    var cmdEnd = ""; // " &"; // "> {0} 2>&1 &".format(outfile);
    var headlessExtras = "-wipe-data -no-boot-anim -no-window -noaudio";
    var cmd = visual ? cmdStart + " " + cmdEnd: 
        cmdStart + " " + headlessExtras + cmdEnd;
    sys.execDetached(cmd);
  };
  this.emuStop = function() {
    sys.exec("adb -s {0} emu kill".format(this.serial));
  };

  /** Emulator-app commands. */
  this.appStop = function(app) {
    sys.exec("adb -s {0} shell am force-stop {1}".format(this.serial, app));
  };
  this.appClear = function(app) {
    sys.exec("adb -s {0} shell pm clear {1}".format(this.serial, app));
  };
  this.appInstall = function(apk) {
    sys.exec("adb -s {0} install {1}".format(this.serial, apk));
  };
  this.appUninstall = function(app) {
    sys.exec("adb -s {0} uninstall {1}".format(this.serial, app));
  };
}

/**
 * Represents collection of all defined emulators.
 * Defines available functions for emulators.
 * Opts:
 *   antInit: if defined, will init from given ant properties file.
 */
function Emulators(opts) {
  var self = this;
  // maps id -> emulator
  self.emus = {}

  /**
   * Define a new emulator.
   */
  self.add = function(id, opts) {
    self.emus[id] = new Emulator(id, opts);
  }

  /** Emulator only commands. */
  self.cmd_start = function(ids, opts) {
    self._execute(ids, function(emu) { emu.emuStart(opts.visual || false); });
  }
  self.cmd_stop = function(ids, opts) {
    self._execute(ids, function(emu) { emu.emuStop(); });
  }

  /** Emulator-app commands. */
  self.cmd_forceStop = function(ids, opts) {
    self._execute(ids, function(emu) { emu.appStop(opts.app); });
  }
  self.cmd_clear = function(ids, opts) {
    self._execute(ids, function(emu) { emu.appClear(opts.app); });
  }
  self.cmd_install = function(ids, opts) {
    self._execute(ids, function(emu) { emu.appInstall(opts.apk); });
  }
  self.cmd_uninstall = function(ids, opts) {
    self._execute(ids, function(emu) { emu.appUninstall(opts.app); });
  }

  self.executeFromOptions = function(opts) {
    self[opts.cmd].call(self, opts.ids, opts);
  }

  /**
   * Run an operation over specific emulator ids or else
   * ALL by default.
   */
  self._execute = function(ids, operation) {
    // if ids are provide start only those
    if (ids !== undefined && ids.length > 0) {
      _.each(ids, function(id) {
        operation(self.emus[id]);
      });
    }
    // otherwise start all of them
    else {
      _.each(self.emus, function(emu, id) {
        operation(emu);
      });
    }
  }

  /**
   * Define emulators based on ant properties file definitions:
   *    emulator.<id>=<serial_num>
   */
  self.initFromAntProps = function(filename) {
    var data = fs.readFileSync(filename).toString();
    var emuDefs = {};
    // TODO: read properties file then process them
    data.split('\n').forEach(function (line) { 
      var match = line.match(/^emulator\.(\d+).console.port=(emulator-(.+))$/);
      if (match) {
        var id = match[1];
        var serial = match[2];
        var port = match[3];
        emuDefs[id] = emuDefs[id] || {};
        emuDefs[id].serial = serial;
        emuDefs[id].port = port;
      } else {
        var match2 = line.match(/^emulator\.(\d+).name=(.+)$/);
        if (match2) {
          var id2 = match2[1];
          var name = match2[2];
          emuDefs[id2] = emuDefs[id] || {};
          emuDefs[id2].name = name;
        }
      }
    });
    console.log(emuDefs);
    _.each(emuDefs, function(item, id) {
      self.add(id, {"serial":item.serial, "name":item.name});
    });
  }

  if (opts && opts.antInit) {
    self.initFromAntProps(opts.antInit);
  }
}

function parseOptions() {
  function defaultVal(val, d) {
    return val !== undefined ? val : d;
  }
  // HOWTO: require certain commands to have "app" or other args

  // dynamically identify all commands by fields prefixed with cmd_,
  // and return this list with the prefix removed.
  // HOWTO: do this simpler?
  var validCommands = 
    _.map(
        _.filter(_.keys(new Emulators()), 
          function(k) {
            return /^cmd_/.test(k);
          }), 
      function(k) {
        return k.replace(/^cmd_/, "")
      });

  program
    .version('0.0.1')
    .usage('<command> [emulator numbers; default=all]')
    .option('-a, --app <app name>', 'E.g. com.zixcorp.brooklyndroid')
    .option('-v, --visual', 'Run emulators in visual rather than headless mode')
    .option('--apk <apk file>', 'E.g. brooklyndroid.apk')
  program.on('--help', function(){
    console.log('  Valid commands: ' + validCommands);
    console.log('');
    console.log('  Examples:');
    console.log('');
    console.log('    $ emulators.js start 2 3 4 --visual');
    console.log('    $ emulators.js forceStop --app com.myapp');
    console.log('');
    });

  program.parse(process.argv);

  // validation on the command
  if (program.args.length < 1) {
    throw "Must provide a command.";
  } else {
    program.cmd = program.args[0];
  }
  if (!_.contains(validCommands, program.cmd)) {
    throw "Unknown command: " + program.cmd;
  }

  var opts = {
    cmd : "cmd_" + program.cmd,
    ids : program.args.slice(1),
    app : defaultVal(program.app, process.env.EMULATORS_APP),
    apk : program.apk, 
    visual : defaultVal(program.visual, false),
  };

  console.log(opts);
  console.log("---");

  return opts;
}

function main() {
  var opts = parseOptions();
  var emus = new Emulators({antInit:"ant.properties"});
  restartAdb(function() {
    emus.executeFromOptions(opts);
  });
}

if (require.main === module) {
  main();
} else {
  exports.Emulator = Emulator;
  exports.Emulators = Emulators;
  exports.sys = sys;
}

