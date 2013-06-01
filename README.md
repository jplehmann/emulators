Emulators.js
============
Emulators.js is a utility to more easily manage an array of emulators and installed applications.


Requirements
------------
Install [node.js]. Then using `npm install <package>` install commander, underscore and jasmine-node.


Options
-------
* Set EMULATORS_APP environment variable to specify a default app.


Unit Tests
----------
To run unit tests:

  If installed jasmine-node globally:

    > jasmine-node spec

  Else something like this:
    
    > node ./node_modules/jasmine-node/lib/jasmine-node/cli.js spec


Backlog
-------
* Redo this using Rhino; this was not a good app for Node.
* try using setTimeout and setInterval/clearInterval
  * check if device is started by repeatedly checking at intervals,
    once done execute a method
* problem with restart adb causes grep to fail
* finish start
  * make start block on it being started
  * outfile with unique name
  * try to create and start 3 times
* add console as another property read from the property file
* project specific
  * signal
  * utilize PROJECT_HOME to find ant.properties (and build.xml?)


Questions
---------
- Decide if commands should be dynamic or specific and implemented, 
  and if the latter, at both Emus and Emu level?
  - problem of dynamic is that i cant print a nice help menu, or
    strictly enforce arguments
    - would like to have each command check its own params and do
      validation
    - and be able to dynamically generate help from them (convention on
      the methods to find them)
- biggest challenges for node.js for emulators
  1. options / checking: wish there was more support for validation
  2. executing commands synch: this is the design of node but makes it difficult for serial shell commands


[node.js]: http://nodejs.org/
