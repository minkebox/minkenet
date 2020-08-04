const Config = require('./Config');
const AddressPool = require('./AddressPool');
const DeviceState = require('./DeviceState');
const Log = require('debug')('adopt');

class Adopt {

  constructor(device) {
    this.device = device;
  }

  async configure() {
    Log('configure:');
    const status = { newaddress: false, newpassword: false };

    status.newaddress = this.setAddress();
    status.newpassword = this.setPassword();
    this.setNetwork();
    this.setVLANMode();

    Log('configured:', status);
    Log(this.device.readKV('$'));

    return status;
  }

  setVLANMode() {
    let status = false;
    if (Config.read('network.vlan.8021q')) {
      this.device.writeKV(DeviceState.KEY_NETWORK_VLANS_8021Q, true);
      const ivl = Config.read('network.vlan.ivl');
      if (typeof ivl === 'boolean') {
        this.device.writeKV(DeviceState.KEY_NETWORK_VLANS_IVL, ivl);
      }
      status = true;
    }

    return status;
  }

  setAddress() {
    if (Config.read('system.ipv4.allocate')) {
      const address = this._allocateAddress();
      let newaddress = (this.device.writeKV(DeviceState.KEY_SYSTEM_IPV4_MODE, 'static') === 'modified');
      newaddress |= (this.device.writeKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS, address) === 'modified');
      this.device.writeKV(DeviceState.KEY_SYSTEM_IPV4_NETMASK, Config.read('system.ipv4.netmask'));
      this.device.writeKV(DeviceState.KEY_SYSTEM_IPV4_GATEWAY, Config.read('system.ipv4.gateway'));
      this.device.writeKV(DeviceState.KEY_SYSTEM_IPV4_DNS, Config.read('system.ipv4.dns'));
      if (newaddress) {
        return 'static';
      }
    }
    return null;
  }

  setPassword() {
    if (!Config.read('system.keychain.defaultpw')) {
      return false;
    }
    const pw = Config.read('system.keychain.password');
    if (this.device.writeKV(DeviceState.KEY_SYSTEM_KEYCHAIN_PASSWORD, pw) === 'modified') {
      return true;
    }
    return false;
  }

  setNetwork() {
    const flowcontrol = Config.read('network.physical.flowcontrol');
    const jumbo = Config.read('network.physical.jumbo');
    const ports = this.device.readKV(DeviceState.KEY_NETWORK_PHYSICAL_PORT, { depth: 1 });
    for (let p in ports) {
      if (typeof flowcontrol === 'boolean') {
        this.device.writeKV(`${DeviceState.KEY_NETWORK_PHYSICAL_PORT}.${p}.flowcontrol`, flowcontrol);
      }
      if (typeof jumbo === 'boolean') {
        this.device.writeKV(`${DeviceState.KEY_NETWORK_PHYSICAL_PORT}.${p}.jumbo`, jumbo);
      }
    }
    const snoop = Config.read('network.igmp.snoop');
    if (typeof snoop === 'boolean') {
      this.device.writeKV(DeviceState.KEY_NETWORK_IGMP_SNOOP, snoop);
    }
  }

  _allocateAddress() {
    return AddressPool.getInstance(Config.read('system.ipv4.pool.start'), Config.read('system.ipv4.pool.end')).allocateAddress();
  }

}

module.exports = Adopt;
