#!/usr/bin/env node

/**
 * Emulators.js is a utility to help manage an array of
 * Android emulators and installed applications.
 */

var exec = require('child_process').exec;
var fs = require('fs'),
    spawn = require('child_process').spawn;

var program = require('commander');
var _ = require('underscore');

var DEFAULT_APP = process.env.EMULATORS_APP;
var DEFAULT_PROP_FILE = process.env.EMULATORS_PROPERTIES || "ant.properties";
var REALLY_EXECUTE = true;
var RESTART_ABD_ALWAYS = false;

//first, checks if it isn't implemented yet
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] !== 'undefined' ? args[number] : match;
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
      exec(cmd, function (error, stdout, stderr) {
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
    console.log("Executing: " + cmd);
    var cmdArray = cmd.trim().split(' ');
    console.log(cmdArray);
    var child = spawn(cmdArray[0], cmdArray.slice(1), {
      //detached: true,
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
  if (RESTART_ABD_ALWAYS) {
    console.log("Restarting adb.");
    sys.exec("adb kill-server", function() {
      sys.exec("adb start-server", function() {
        console.log("Restart of adb complete.");
        if (next !== undefined) {
          next();
        }
      });
    });
  } else {
    next();
  }
}

/**
 * A configured emulator, which may not be started.
 */
function Emulator(id, options) {
  var self = this;
  self.id = id;
  //self.options = options;
  self.serial = options.serial;
  self.name = options.name;
  self.port = self.serial.substring(9);

  /** Emulator only commands. */
  self.emuStart = function(visual) {
    // TODO: try up to 3 times to start the emulator
    // TODO: create a unique outfile
    //var outfile = "/tmp/" + self.serial;
    //var cmdStart = "nohup emulator -avd {0} -port {1}".format(self.name, self.port);
    // TODO: redirect output to logfile
    var cmdStart = "emulator -avd {0} -port {1}".format(self.name, self.port),
        cmdEnd = "", // " &"; // "> {0} 2>&1 &".format(outfile),
        headlessExtras = "-wipe-data -no-boot-anim -no-window -noaudio",
        cmd = visual ? 
          cmdStart + " " + cmdEnd : 
          cmdStart + " " + headlessExtras + cmdEnd;
    sys.execDetached(cmd);
  };
  self.emuStop = function() {
    console.log("trying to stop: " + self.serial);
    self._doIfRunning(function() {
      sys.exec("adb -s {0} emu kill".format(self.serial));
    });
  };

  /** Emulator-app commands. */
  self.appStop = function(app) {
    self._doIfRunning(function() {
      sys.exec("adb -s {0} shell am force-stop {1}".format(self.serial, app));
    });
  };
  self.appClear = function(app) {
    self._doIfRunning(function() {
      sys.exec("adb -s {0} shell pm clear {1}".format(self.serial, app));
    });
  };
  self.appInstall = function(apk) {
    self._doIfRunning(function() {
      sys.exec("adb -s {0} install {1}".format(self.serial, apk));
    });
  };
  self.appUninstall = function(app) {
    self._doIfRunning(function() {
      sys.exec("adb -s {0} uninstall {1}".format(self.serial, app));
    });
  };
  /**
   * Execute the callback onResult iff self emulator is currently running.
   */
  self._doIfRunning = function(onResult) {
    // true if 
    //   adb devices | grep self.serial != ""
    console.log("DBG: running 'adb devices | grep " + self.serial);
    var child = exec("adb devices | grep " + self.serial,
      function (error, stdout, stderr) {
        //console.log("adb device grep got: " + stdout);
        if (stdout.trim().match("^" + self.serial)) {
          onResult();
        } else {
          console.log("Emulator is not running: {0} \n({1})".format(self.serial, stdout));
        }
      }
    );
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
  self.emus = {};

  /**
   * Define a new emulator.
   */
  self.add = function(id, opts) {
    self.emus[id] = new Emulator(id, opts);
  };

  /** Emulator only commands. */
  self.cmd_start = function(ids, opts) {
    self._execute(ids, function(emu) { emu.emuStart(opts.visual || false); });
  };
  self.cmd_stop = function(ids, opts) {
    self._execute(ids, function(emu) { emu.emuStop(); });
  };

  /** Emulator-app commands. */
  self.cmd_forceStop = function(ids, opts) {
    self._execute(ids, function(emu) { emu.appStop(opts.app); });
  };
  self.cmd_clear = function(ids, opts) {
    self._execute(ids, function(emu) { emu.appClear(opts.app); });
  };
  self.cmd_install = function(ids, opts) {
    self._execute(ids, function(emu) { emu.appInstall(opts.apk); });
  };
  self.cmd_uninstall = function(ids, opts) {
    self._execute(ids, function(emu) { emu.appUninstall(opts.app); });
  };

  self.executeFromOptions = function(opts) {
    self[opts.cmd].call(self, opts.ids, opts);
  };

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
  };

  /**
   * Load a key-value properties file into an object.
   */
  self.loadProperties = function(filename) {
    var data = fs.readFileSync(filename).toString(),
        props = {};
    // create an object of the property value pairs
    data.split('\n').forEach(function (line) { 
      if (line.trim().length > 0) {
        var vals = line.split('=');
        try {
          props[vals[0].trim()] = vals[1].trim();
        } catch (err) {
        }
      }
    });
    return props;
  };

  /**
   * Define emulators based on ant properties file definitions.
   */
  self.initFromAntProps = function(filename) {
    var props = this.loadProperties(filename),
        size = _.pairs(props).length;
    // assume that # emulators <= # of properties
    // probe to find out which ones exist
    for (var i=0; i < size; i++) {
      var name = props["emulator.{0}.name".format(i)];
      var serial = props["emulator.{0}.console.port".format(i)];
      if (name && serial) {
        self.add(i, {name:name, serial:serial});
      }
    }
  };

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
            return (/^cmd_/).test(k);
          }), 
      function(k) {
        return k.replace(/^cmd_/, "");
      });

  program
    .version('0.0.1')
    .usage('<command> [emulator numbers; default=all]')
    .option('-a, --app <app name>', 'E.g. com.mycorp.myapp')
    .option('-v, --visual', 'Run emulators in visual rather than headless mode')
    .option('--apk <apk file>', 'E.g. myapp.apk');
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
    console.log("\nERROR: Please must provide a command argument.");
    program.help();
  } else {
    program.cmd = program.args[0];
  }
  if (!_.contains(validCommands, program.cmd)) {
    console.log("\nERROR: Unknown command: " + program.cmd);
    program.help();
  }

  var opts = {
    cmd : "cmd_" + program.cmd,
    ids : program.args.slice(1),
    app : defaultVal(program.app, DEFAULT_APP),
    apk : program.apk, 
    visual : defaultVal(program.visual, false)
  };

  console.log(opts);
  console.log("---");

  return opts;
}

function main() {
  var opts = parseOptions();
  var emus = new Emulators({antInit:DEFAULT_PROP_FILE});
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

