
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


Todos
-----
x update commands to be the correct ones
  x extract PORT from serial # ( :9)
  x emu name
* finish start
  * make start block on it being started
  * outfile with unique name
  * try to create and start 3 times
* resetAdb
* check if emus are running by grepping adb (before every command?)
* add console as another property read from the property file

* brooklyn specific
  * signal
  * utilize BROOKLYN_HOME to find ant.properties (and build.xml?)


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


[node.js]: http://nodejs.org/
