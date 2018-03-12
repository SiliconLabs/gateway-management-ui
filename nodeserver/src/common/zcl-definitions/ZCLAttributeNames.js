var Constants = require('../Constants.js');

// Attributes object for reading.
var ZCLAttributeNames = {};

ZCLAttributeNames[Constants.ON_OFF_CLUSTER] = {};
ZCLAttributeNames[Constants.COLOR_CONTROL_CLUSTER] = {};
ZCLAttributeNames[Constants.LEVEL_CONTROL_CLUSTER] = {};

ZCLAttributeNames[Constants.BOOTLOADER_CLUSTER] = {};
ZCLAttributeNames[Constants.BOOTLOADER_CLUSTER][Constants.FIRMWARE_VERSION_ATTRIBUTE] = 'firmwareVersion';
ZCLAttributeNames[Constants.BOOTLOADER_CLUSTER][Constants.IMAGE_TYPE_ATTRIBUTE] = 'imageTypeId';
ZCLAttributeNames[Constants.BOOTLOADER_CLUSTER][Constants.MANUFACTURER_ID_ATTRIBUTE] = 'manufacturerId';

ZCLAttributeNames[Constants.TEMPERATURE_CLUSTER] = {};
ZCLAttributeNames[Constants.TEMPERATURE_CLUSTER][Constants.TEMPERATURE_VAL_ATTRIBUTE] = 'temperatureValue';

ZCLAttributeNames[Constants.IAS_ZONE_CLUSTER] = {};
ZCLAttributeNames[Constants.IAS_ZONE_CLUSTER][Constants.ZONESTATUS_VAL_ATTRIBUTE] = 'zoneStatus';

ZCLAttributeNames[Constants.SIMPLE_METERING_CLUSTER] = {};
ZCLAttributeNames[Constants.SIMPLE_METERING_CLUSTER][Constants.UNIT_OF_MEASURE_ATTRIBUTE] = 'powersumUnits';
ZCLAttributeNames[Constants.SIMPLE_METERING_CLUSTER][Constants.MULTIPLIER_ATTRIBUTE] = 'powersumMultiplier';
ZCLAttributeNames[Constants.SIMPLE_METERING_CLUSTER][Constants.DIVISOR_ATTRIBUTE] = 'powersumDivisor';
ZCLAttributeNames[Constants.SIMPLE_METERING_CLUSTER][Constants.SUMMATION_FORMATTING_ATTRIBUTE] = 'powersumFormatting';
ZCLAttributeNames[Constants.SIMPLE_METERING_CLUSTER][Constants.SUMMATION_VAL_ATTRIBUTE] = 'powersumValue';

ZCLAttributeNames[Constants.ILLUMINANCE_CLUSTER] = {};
ZCLAttributeNames[Constants.ILLUMINANCE_CLUSTER][Constants.ILLUMINANCE_VAL_ATTRIBUTE] = 'luxReading';

ZCLAttributeNames[Constants.HUMIDITY_CLUSTER] = {};
ZCLAttributeNames[Constants.HUMIDITY_CLUSTER][Constants.HUMIDITY_VAL_ATTRIBUTE] = 'humidityReading';

ZCLAttributeNames[Constants.OCCUPANCY_CLUSTER] = {};
ZCLAttributeNames[Constants.OCCUPANCY_CLUSTER][Constants.OCCUPANCY_VAL_ATTRIBUTE] = 'occupancyReading';
ZCLAttributeNames[Constants.OCCUPANCY_CLUSTER][Constants.OCCUPANCY_SENSOR_TYPE_ATTRIBUTE] = 'occupancySensorType';

ZCLAttributeNames[Constants.ELECTRICAL_CLUSTER] = {};
ZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.RMS_VOLTAGE_VAL_ATTRIBUTE] = 'rmsVoltage';
ZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.RMS_CURRENT_VAL_ATTRIBUTE] = 'rmsCurrent';
ZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.ACTIVE_POWER_VAL_ATTRIBUTE] = 'activePower';
ZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.ALARMS_MASK_ATTRIBUTE] = 'alarmMask';
ZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.VOLTAGE_OVERLOAD_ATTRIBUTE] = 'voltageOverload';
ZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.CURRENT_OVERLOAD_ATTRIBUTE] = 'currentOverload';
ZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.ACTIVE_POWER_OVERLOAD_ATTRIBUTE] = 'powerOverload';

// Reportable attributes object.
var ReportableZCLAttributeNames = {};

ReportableZCLAttributeNames[Constants.TEMPERATURE_CLUSTER] = {};
ReportableZCLAttributeNames[Constants.TEMPERATURE_CLUSTER][Constants.TEMPERATURE_VAL_ATTRIBUTE] = 'temperatureValue';

ReportableZCLAttributeNames[Constants.IAS_ZONE_CLUSTER] = {};
ReportableZCLAttributeNames[Constants.IAS_ZONE_CLUSTER][Constants.ZONESTATUS_VAL_ATTRIBUTE] = 'zoneStatus';

ReportableZCLAttributeNames[Constants.SIMPLE_METERING_CLUSTER] = {};
ReportableZCLAttributeNames[Constants.SIMPLE_METERING_CLUSTER][Constants.SUMMATION_VAL_ATTRIBUTE] = 'powersumValue';

ReportableZCLAttributeNames[Constants.ILLUMINANCE_CLUSTER] = {};
ReportableZCLAttributeNames[Constants.ILLUMINANCE_CLUSTER][Constants.ILLUMINANCE_VAL_ATTRIBUTE] = 'luxReading';

ReportableZCLAttributeNames[Constants.HUMIDITY_CLUSTER] = {};
ReportableZCLAttributeNames[Constants.HUMIDITY_CLUSTER][Constants.HUMIDITY_VAL_ATTRIBUTE] = 'humidityReading';

ReportableZCLAttributeNames[Constants.OCCUPANCY_CLUSTER] = {};
ReportableZCLAttributeNames[Constants.OCCUPANCY_CLUSTER][Constants.OCCUPANCY_VAL_ATTRIBUTE] = 'occupancyReading';
ReportableZCLAttributeNames[Constants.OCCUPANCY_CLUSTER][Constants.OCCUPANCY_SENSOR_TYPE_ATTRIBUTE] = 'occupancySensorType';

ReportableZCLAttributeNames[Constants.ELECTRICAL_CLUSTER] = {};
ReportableZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.RMS_VOLTAGE_VAL_ATTRIBUTE] = 'rmsVoltage';
ReportableZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.RMS_CURRENT_VAL_ATTRIBUTE] = 'rmsCurrent';
ReportableZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.ACTIVE_POWER_VAL_ATTRIBUTE] = 'activePower';
ReportableZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.ALARMS_MASK_ATTRIBUTE] = 'alarmMask';
ReportableZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.VOLTAGE_OVERLOAD_ATTRIBUTE] = 'voltageOverload';
ReportableZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.CURRENT_OVERLOAD_ATTRIBUTE] = 'currentOverload';
ReportableZCLAttributeNames[Constants.ELECTRICAL_CLUSTER][Constants.ACTIVE_POWER_OVERLOAD_ATTRIBUTE] = 'powerOverload';

module.exports = {
  ZCLAttributeNames: ZCLAttributeNames,
  ReportableZCLAttributeNames: ReportableZCLAttributeNames
};
