var emulators = require('../emulators');

describe("Emulators", function() {
  var sys = emulators.sys;
  var emus = new emulators.Emulators();

  // define emulators 
  emus.add(1, {name:"emu1", serial:"emulator-5560"});
  emus.add(2, {name:"emu2", serial:"emulator-5562"});
  emus.add(3, {name:"emu3", serial:"emulator-5564"});

  var opts = {};

  it("should start multiple emulators", function() {
    spyOn(sys, 'executeDetached').andReturn(0);
    emus.cmd_start([2,3], opts);
    expect(sys.executeDetached).toHaveBeenCalledWith("emulator -avd emu2 -port 5562 -wipe-data -no-boot-anim -no-window -noaudio");
    expect(sys.executeDetached).toHaveBeenCalledWith("emulator -avd emu3 -port 5564 -wipe-data -no-boot-anim -no-window -noaudio");
    expect(sys.executeDetached.calls.length).toEqual(2);
  });

  it("should stop all emulators", function() {
    spyOn(sys, 'execute').andReturn(0);
    emus.cmd_stop([], opts);
    expect(sys.execute).toHaveBeenCalledWith("adb -s emulator-5560 emu kill");
    expect(sys.execute).toHaveBeenCalledWith("adb -s emulator-5562 emu kill");
    expect(sys.execute).toHaveBeenCalledWith("adb -s emulator-5564 emu kill");
    expect(sys.execute.calls.length).toEqual(3);
  });

  it("should force stop when executing with options", function() {
    spyOn(sys, 'execute').andReturn(0);
    emus.executeFromOptions({ids: [1], cmd: 'cmd_forceStop', app: "myapp"});
    expect(sys.execute).toHaveBeenCalledWith("adb -s emulator-5560 shell am force-stop myapp");
    expect(sys.execute.calls.length).toEqual(1);
  });

});

