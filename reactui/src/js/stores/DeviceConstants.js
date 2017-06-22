var Constants = require('../Constants');

var lights = {};
lights[Constants.DEVICE_ID_ON_OFF_LIGHT] = 'Light';
lights[Constants.DEVICE_ID_DIMMABLE_LIGHT] = 'Dimmable Light';
lights[Constants.DEVICE_ID_HA_ON_OFF_LIGHT] = 'Ha On/Off Light Switch';
lights[Constants.DEVICE_ID_COLOR_DIMMABLE_LIGHT] = 'Dimmable Color Light';
lights[Constants.DEVICE_ID_EXTENDED_COLOR_LIGHT] = 'Extended Color Light';
lights[Constants.DEVICE_ID_COLOR_TEMPERATURE_LIGHT] = 'Color Temperature Light';

var switches = {};
switches[Constants.DEVICE_ID_ON_OFF_SWITCH] = 'Switch';
switches[Constants.DEVICE_ID_LEVEL_CONTROL_SWITCH] = 'Dimmer';
switches[Constants.DEVICE_ID_COLOR_DIMMER_SWITCH] = 'Dimmer';

var sensors = {};
sensors[Constants.DEVICE_TYPE_SENSOR] = 'Multi Sensor';
sensors[Constants.DEVICE_TYPE_CONTACT_SENSOR] = 'Contact Sensor';
sensors[Constants.DEVICE_TYPE_OCCUPANCY_SENSOR] = 'Occupancy Sensor';

var smartplugs = {};
smartplugs[Constants.DEVICE_TYPE_SMART_PLUG] = 'Smart Plug';

var deviceTuple = [];
deviceTuple.push(lights);
deviceTuple.push(switches);
deviceTuple.push(sensors);
deviceTuple.push(smartplugs);

var nodestate = {};
nodestate[Constants.ND_JUST_JOINED] = 'Joining';
nodestate[Constants.ND_HAVE_ACTIVE] = 'Joining';
nodestate[Constants.ND_HAVE_EP_DESC] = 'Joining';
nodestate[Constants.ND_JOINED] = 'Joined';
nodestate[Constants.ND_UNRESPONSIVE] = 'Unresponsive';
nodestate[Constants.ND_LEAVE_SENT] = 'Leave Sent';
nodestate[Constants.ND_LEFT] = 'Left';
nodestate[Constants.ND_UNKNOWN] = 'Unknown';

var nodeListBindableClusters = {};
nodeListBindableClusters[Constants.OCCUPANCY_CLUSTER] = 'Occupancy Cluster';
nodeListBindableClusters[Constants.IAS_ZONE_CLUSTER] = 'IAS Zone Cluster';
nodeListBindableClusters[Constants.ON_OFF_CLUSTER] = 'On/Off Cluster';
nodeListBindableClusters[Constants.COLOR_CONTROL_CLUSTER] = 'Color-Control Cluster';
nodeListBindableClusters[Constants.LEVEL_CONTROL_CLUSTER] = 'Level-Control Cluster';

var supportedBindingInCloudRules = [];
var OccupancyBindOnOff = {};
OccupancyBindOnOff.inputCluster = Constants.OCCUPANCY_CLUSTER;
OccupancyBindOnOff.outputCluster = Constants.ON_OFF_CLUSTER;
var IASZoneBindOnOff = {};
IASZoneBindOnOff.inputCluster = Constants.IAS_ZONE_CLUSTER;
IASZoneBindOnOff.outputCluster = Constants.ON_OFF_CLUSTER;

supportedBindingInCloudRules.push(OccupancyBindOnOff);
supportedBindingInCloudRules.push(IASZoneBindOnOff);

module.exports = {
  lights: lights,
  switches: switches,
  sensors: sensors,
  smartplugs: smartplugs,
  deviceTuple: deviceTuple,
  nodestate: nodestate,
  nodeListBindableClusters: nodeListBindableClusters,
  supportedBindingInCloudRules: supportedBindingInCloudRules
};
