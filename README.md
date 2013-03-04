
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

    > jasmine-node spec/emulators.spec.js


Todos
-----
x update commands to be the correct ones
  x extract PORT from serial # ( :9)
  * emu name
  * outfile with unique name
* try to create and start 3 times
* resetAdb
* signal
* ant properties, replace . with _
* utilize BROOKLYN_HOME to find ant.properties
* check if emus are running by grepping adb (before every command?)
* add console as another property read from the property file


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
