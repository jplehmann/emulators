var emulators = require('../emulators');

describe("Emulators", function() {
  var sys = emulators.sys;
  var emus = new emulators.Emulators();

  // define emulators 
  emus.add(1, {"serial": "emulator-5560"});
  emus.add(2, {"serial": "emulator-5562"});
  emus.add(3, {"serial": "emulator-5564"});

  it("should start multiple emulators", function() {
    spyOn(sys, 'execute').andReturn(0);
    emus.cmd_start([2,3]);
    expect(sys.execute).toHaveBeenCalledWith("emulators start emulator-5562");
    expect(sys.execute).toHaveBeenCalledWith("emulators start emulator-5564");
    expect(sys.execute.calls.length).toEqual(2);
  });

  it("should stop all emulators", function() {
    spyOn(sys, 'execute').andReturn(0);
    emus.cmd_stop();
    expect(sys.execute).toHaveBeenCalledWith("emulators stop emulator-5560");
    expect(sys.execute).toHaveBeenCalledWith("emulators stop emulator-5562");
    expect(sys.execute).toHaveBeenCalledWith("emulators stop emulator-5564");
    expect(sys.execute.calls.length).toEqual(3);
  });

  it("should force stop when executing with options", function() {
    spyOn(sys, 'execute').andReturn(0);
    emus.executeFromOptions({ids: [1], cmd: 'cmd_forceStop', app: "myapp"});
    expect(sys.execute).toHaveBeenCalledWith("adb -s emulator-5560 forceStop myapp");
    expect(sys.execute.calls.length).toEqual(1);
  });

});

