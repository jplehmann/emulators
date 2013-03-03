
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
* Test with real emulators and adb commands.


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
