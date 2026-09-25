/**
 * Lueur uses local notifications only. expo-notifications adds the
 * `aps-environment` entitlement for remote push, which would require the Push
 * Notifications capability in the App ID and provisioning profile. Local
 * notifications need no entitlement, so it is removed.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withIosLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
