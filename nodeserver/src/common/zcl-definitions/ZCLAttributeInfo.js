// Copyright 2015 Silicon Laboratories, Inc.

var Constants = require('../Constants');

var DEFAULT_MAX_REPORTING = 1800;

var ZCLAttributeInfo = {
   firmwareVersion: {
    clusterID: Constants.BOOTLOADER_CLUSTER,
    attributeID: Constants.FIRMWARE_VERSION_ATTRIBUTE,
    datatype: Constants.FIRMWARE_VERSION_TYPE,
    clusterFriendly: 'bootloaderCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  imageTypeId: {
    clusterID: Constants.BOOTLOADER_CLUSTER,
    attributeID: Constants.IMAGE_TYPE_ATTRIBUTE,
    datatype: Constants.IMAGE_TYPE_TYPE,
    clusterFriendly: 'bootloaderCluster',
    defaultdefaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  manufacturerId: {
    clusterID: Constants.BOOTLOADER_CLUSTER,
    attributeID: Constants.MANUFACTURER_ID_ATTRIBUTE,
    datatype: Constants.MANUFACTURER_ID_TYPE,
    clusterFriendly: 'bootloaderCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  // kWh = divisor 3600000 format = 51 multi = 1 units = 0,
  // 1*(value)/3600000 kWh = 0.001 kWh
  // 3600 is 1 wh
  powersumValue: {
    clusterID: Constants.SIMPLE_METERING_CLUSTER,
    attributeID: Constants.SUMMATION_VAL_ATTRIBUTE,
    datatype: Constants.SUMMATION_VAL_TYPE,
    clusterFriendly: 'simpleMeteringCluster',
    defaultReportableChangeThreshold: 3600,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  // Current Temperature is reported in Value = 100 * C = -273.15 to 327.67 deg Celsius
  // 50 is 50/100 = .5 C
  temperatureValue:{
    clusterID: Constants.TEMPERATURE_CLUSTER,
    attributeID: Constants.TEMPERATURE_VAL_ATTRIBUTE,
    datatype: Constants.TEMPERATURE_VAL_TYPE,
    clusterFriendly: 'temperatureCluster',
    defaultReportableChangeThreshold: 50,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  // Current Humidity: MeasuredVal = 100 x Relative Humidity (0 to 100% in 0.01% increments)
  // So 500 / 100 = 5% and 10000 / 100 = 100%
  // Threshhold is 500
  humidityReading: {
    clusterID: Constants.HUMIDITY_CLUSTER,
    attributeID: Constants.HUMIDITY_VAL_ATTRIBUTE,
    datatype: Constants.HUMIDITY_VAL_TYPE,
    clusterFriendly: 'humidityCluster',
    defaultReportableChangeThreshold: 500,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  // Illuminance: MeasuredValue = 10,000 * log10 (lux+1)
  // Range = 1 lx to 3.576 MLx. Measured Value Range: 1 to 0xfffe
  // So 20 lux range is = 10,000 * log10 (20 + 1) = 13222
  luxReading: {
    clusterID: Constants.ILLUMINANCE_CLUSTER,
    attributeID: Constants.ILLUMINANCE_VAL_ATTRIBUTE,
    datatype: Constants.ILLUMINANCE_VAL_TYPE,
    clusterFriendly: 'illuminanceCluster',
    defaultReportableChangeThreshold: 13222,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  // MeasureVal = 10 * V
  // 10 is 1V threshhold
  rmsVoltage: {
    clusterID: Constants.ELECTRICAL_CLUSTER,
    attributeID: Constants.RMS_VOLTAGE_VAL_ATTRIBUTE,
    datatype: Constants.RMS_VOLTAGE_VAL_TYPE,
    clusterFriendly: 'electricalCluster',
    defaultReportableChangeThreshold: 10,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  // MeasureVal = mA
  // 10 is 10mA threshhold
  rmsCurrent: {
    clusterID: Constants.ELECTRICAL_CLUSTER,
    attributeID: Constants.RMS_CURRENT_VAL_ATTRIBUTE,
    datatype: Constants.RMS_CURRENT_VAL_TYPE,
    clusterFriendly: 'electricalCluster',
    defaultReportableChangeThreshold: 10,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  // MeasureVal = 10 * W
  // 1 = .1 W threshhold
  activePower: {
    clusterID: Constants.ELECTRICAL_CLUSTER,
    attributeID: Constants.ACTIVE_POWER_VAL_ATTRIBUTE,
    datatype: Constants.ACTIVE_POWER_VAL_TYPE,
    clusterFriendly: 'electricalCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  zoneStatus: {
    clusterID: Constants.IAS_ZONE_CLUSTER,
    attributeID: Constants.ZONESTATUS_VAL_ATTRIBUTE,
    datatype: Constants.ZONESTATUS_VAL_TYPE,
    clusterFriendly: 'iasZoneCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  powersumUnits: {
    clusterID: Constants.SIMPLE_METERING_CLUSTER,
    attributeID: Constants.UNIT_OF_MEASURE_ATTRIBUTE,
    datatype: Constants.UNIT_OF_MEASURE_TYPE,
    clusterFriendly: 'simpleMeteringCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  powersumMultiplier: {
    clusterID: Constants.SIMPLE_METERING_CLUSTER,
    attributeID: Constants.MULTIPLIER_ATTRIBUTE,
    datatype: Constants.MULTIPLIER_TYPE,
    clusterFriendly: 'simpleMeteringCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  powersumDivisor: {
    clusterID: Constants.SIMPLE_METERING_CLUSTER,
    attributeID: Constants.DIVISOR_ATTRIBUTE,
    datatype: Constants.DIVISOR_TYPE,
    clusterFriendly: 'simpleMeteringCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  powersumFormatting: {
    clusterID: Constants.SIMPLE_METERING_CLUSTER,
    attributeID: Constants.SUMMATION_FORMATTING_ATTRIBUTE,
    datatype: Constants.SUMMATION_FORMATTING_TYPE,
    clusterFriendly: 'simpleMeteringCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  occupancyReading: {
    clusterID: Constants.OCCUPANCY_CLUSTER,
    attributeID: Constants.OCCUPANCY_VAL_ATTRIBUTE,
    datatype: Constants.OCCUPANCY_VAL_TYPE,
    clusterFriendly: 'occupancyCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  occupancySensorType: {
    clusterID: Constants.OCCUPANCY_CLUSTER,
    attributeID: Constants.OCCUPANCY_SENSOR_TYPE_ATTRIBUTE,
    datatype: Constants.OCCUPANCY_SENSOR_TYPE_TYPE,
    clusterFriendly: 'occupancyCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  alarmMask: {
    clusterID: Constants.ELECTRICAL_CLUSTER,
    attributeID: Constants.ALARMS_MASK_ATTRIBUTE,
    datatype: Constants.ALARMS_MASK_TYPE,
    clusterFriendly: 'electricalCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  voltageOverload: {
    clusterID: Constants.ELECTRICAL_CLUSTER,
    attributeID: Constants.VOLTAGE_OVERLOAD_ATTRIBUTE,
    datatype: Constants.VOLTAGE_OVERLOAD_TYPE,
    clusterFriendly: 'electricalCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  currentOverload: {
    clusterID: Constants.ELECTRICAL_CLUSTER,
    attributeID: Constants.CURRENT_OVERLOAD_ATTRIBUTE,
    datatype: Constants.CURRENT_OVERLOAD_TYPE,
    clusterFriendly: 'electricalCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  powerOverload: {
    clusterID: Constants.ELECTRICAL_CLUSTER,
    attributeID: Constants.ACTIVE_POWER_OVERLOAD_ATTRIBUTE,
    datatype: Constants.ACTIVE_POWER_OVERLOAD_TYPE,
    clusterFriendly: 'electricalCluster',
    defaultReportableChangeThreshold: 1,
    defaultReportingMin: 1,
    defaultReportingMax: DEFAULT_MAX_REPORTING
  },
  rssiValue: {
    clusterID: Constants.DIAGNOSTICS_CLUSTER,
    attributeID: Constants.RSSI_VAL_ATTRIBUTE,
    datatype: Constants.RSSI_VAL_TYPE,
    clusterFriendly: 'diagnosticsCluster'
  },
  lqiValue: {
    clusterID: Constants.DIAGNOSTICS_CLUSTER,
    attributeID: Constants.LQI_VAL_ATTRIBUTE,
    datatype: Constants.LQI_VAL_TYPE,
    clusterFriendly: 'diagnosticsCluster'
  }
};

module.exports = ZCLAttributeInfo;
