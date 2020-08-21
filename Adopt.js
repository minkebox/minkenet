const Config = require('./Config');
const AddressPool = require('./AddressPool');
const DeviceState = require('./DeviceState');
const Log = require('debug')('adopt');

class Adopt {

  constructor(device) {
    this.device = device;
  }

  async configure(config) {
    Log('configure:');
    const status = { newaddress: false, newpassword: false };

    // If this devices uses SNMP we must enable this first before changing anything else
    if (this.device.description.snmp) {
      await this.enableSNMP();
    }

    // Get some initial device state
    await this.device.read();

    // Commit the username/password that we entered. These are what's currently on the device so
    // we don't want these to look like changes. We can never read these from the device.
    this.device.state.localKV(DeviceState.KEY_SYSTEM_KEYCHAIN_USERNAME, true);
    this.device.state.localKV(DeviceState.KEY_SYSTEM_KEYCHAIN_PASSWORD, true);
    this.device.writeKV(DeviceState.KEY_SYSTEM_KEYCHAIN_USERNAME, config.username, { track: false });
    this.device.writeKV(DeviceState.KEY_SYSTEM_KEYCHAIN_PASSWORD, config.password, { track: false });
    // Update the password if requested
    status.newpassword = this.setPassword();

    status.newaddress = this.setAddress();
    this.setNetwork();
    this.setVLANMode();

    Log('configured:', status);

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

  async enableSNMP() {
    Log('enableSNMP:');
    const snmp = this.device.description.snmp;
    this.device.writeKV(DeviceState.KEY_SYSTEM_SNMP, {}, { create: true });
    this.device.writeKV(DeviceState.KEY_SYSTEM_SNMP_ENABLE, true, { create: true });
    this.device.writeKV(DeviceState.KEY_SYSTEM_SNMP_VERSION, snmp.version, { create: true }); // v1 and v2c only
    try {
      await this.device.write();
      await this.device.commit();
    }
    catch (e) {
      Log(e);
    }
  }

}

module.exports = Adopt;
