var ZCLDataTypes = {
  '0': {
    'ZCLDataType': 'ZCL_NO_DATA_ATTRIBUTE_TYPE',
    'bytes': 0
  },
  '8': {
    'ZCLDataType': 'ZCL_DATA8_ATTRIBUTE_TYPE',
    'bytes': 1
  },
  '9': {
    'ZCLDataType': 'ZCL_DATA16_ATTRIBUTE_TYPE',
    'bytes': 2
  },
  '10': {
    'ZCLDataType': 'ZCL_DATA24_ATTRIBUTE_TYPE',
    'bytes': 3
  },
  '11': {
    'ZCLDataType': 'ZCL_DATA32_ATTRIBUTE_TYPE',
    'bytes': 4
  },
  '12': {
    'ZCLDataType': 'ZCL_DATA40_ATTRIBUTE_TYPE',
    'bytes': 5
  },
  '13': {
    'ZCLDataType': 'ZCL_DATA48_ATTRIBUTE_TYPE',
    'bytes': 6
  },
  '14': {
    'ZCLDataType': 'ZCL_DATA56_ATTRIBUTE_TYPE',
    'bytes': 7
  },
  '15': {
    'ZCLDataType': 'ZCL_DATA64_ATTRIBUTE_TYPE',
    'bytes': 8
  },
  '16': {
    'ZCLDataType': 'ZCL_BOOLEAN_ATTRIBUTE_TYPE',
    'bytes': 1
  },
  '24': {
    'ZCLDataType': 'ZCL_BITMAP8_ATTRIBUTE_TYPE',
    'bytes': 1
  },
  '25': {
    'ZCLDataType': 'ZCL_BITMAP16_ATTRIBUTE_TYPE',
    'bytes': 2
  },
  '26': {
    'ZCLDataType': 'ZCL_BITMAP24_ATTRIBUTE_TYPE',
    'bytes': 3
  },
  '27': {
    'ZCLDataType': 'ZCL_BITMAP32_ATTRIBUTE_TYPE',
    'bytes': 4
  },
  '28': {
    'ZCLDataType': 'ZCL_BITMAP40_ATTRIBUTE_TYPE',
    'bytes': 5
  },
  '29': {
    'ZCLDataType': 'ZCL_BITMAP48_ATTRIBUTE_TYPE',
    'bytes': 6
  },
  '30': {
    'ZCLDataType': 'ZCL_BITMAP56_ATTRIBUTE_TYPE',
    'bytes': 7
  },
  '31': {
    'ZCLDataType': 'ZCL_BITMAP64_ATTRIBUTE_TYPE',
    'bytes': 8
  },
  '32': {
    'ZCLDataType': 'ZCL_INT8U_ATTRIBUTE_TYPE',
    'bytes': 1,
    'signed': false
  },
  '33': {
    'ZCLDataType': 'ZCL_INT16U_ATTRIBUTE_TYPE',
    'bytes': 2,
    'signed': false
  },
  '34': {
    'ZCLDataType': 'ZCL_INT24U_ATTRIBUTE_TYPE',
    'bytes': 3,
    'signed': false
  },
  '35': {
    'ZCLDataType': 'ZCL_INT32U_ATTRIBUTE_TYPE',
    'bytes': 4,
    'signed': false
  },
  '36': {
    'ZCLDataType': 'ZCL_INT40U_ATTRIBUTE_TYPE',
    'bytes': 5,
    'signed': false
  },
  '37': {
    'ZCLDataType': 'ZCL_INT48U_ATTRIBUTE_TYPE',
    'bytes': 6,
    'signed': false
  },
  '38': {
    'ZCLDataType': 'ZCL_INT56U_ATTRIBUTE_TYPE',
    'bytes': 7,
    'signed': false
  },
  '39': {
    'ZCLDataType': 'ZCL_INT64U_ATTRIBUTE_TYPE',
    'bytes': 8,
    'signed': false
  },
  '40': {
    'ZCLDataType': 'ZCL_INT8S_ATTRIBUTE_TYPE',
    'bytes': 1,
    'signed': true
  },
  '41': {
    'ZCLDataType': 'ZCL_INT16S_ATTRIBUTE_TYPE',
    'bytes': 2,
    'signed': true
  },
  '42': {
    'ZCLDataType': 'ZCL_INT24S_ATTRIBUTE_TYPE',
    'bytes': 3,
    'signed': true
  },
  '43': {
    'ZCLDataType': 'ZCL_INT32S_ATTRIBUTE_TYPE',
    'bytes': 4,
    'signed': true
  },
  '44': {
    'ZCLDataType': 'ZCL_INT40S_ATTRIBUTE_TYPE',
    'bytes': 5,
    'signed': true
  },
  '45': {
    'ZCLDataType': 'ZCL_INT48S_ATTRIBUTE_TYPE',
    'bytes': 6,
    'signed': true
  },
  '46': {
    'ZCLDataType': 'ZCL_INT56S_ATTRIBUTE_TYPE',
    'bytes': 7,
    'signed': true
  },
  '47': {
    'ZCLDataType': 'ZCL_INT64S_ATTRIBUTE_TYPE',
    'bytes': 8,
    'signed': true
  },
  '48': {
    'ZCLDataType': 'ZCL_ENUM8_ATTRIBUTE_TYPE',
    'bytes': 1
  },
  '49': {
    'ZCLDataType': 'ZCL_ENUM16_ATTRIBUTE_TYPE',
    'bytes': 2
  },
  '56': {
    'ZCLDataType': 'ZCL_FLOAT_SEMI_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '57': {
    'ZCLDataType': 'ZCL_FLOAT_SINGLE_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '58': {
    'ZCLDataType': 'ZCL_FLOAT_DOUBLE_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '65': {
    'ZCLDataType': 'ZCL_OCTET_STRING_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '66': {
    'ZCLDataType': 'ZCL_CHAR_STRING_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '67': {
    'ZCLDataType': 'ZCL_LONG_OCTET_STRING_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '68': {
    'ZCLDataType': 'ZCL_LONG_CHAR_STRING_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '72': {
    'ZCLDataType': 'ZCL_ARRAY_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '76': {
    'ZCLDataType': 'ZCL_STRUCT_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '80': {
    'ZCLDataType': 'ZCL_SET_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '81': {
    'ZCLDataType': 'ZCL_BAG_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '224': {
    'ZCLDataType': 'ZCL_TIME_OF_DAY_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '225': {
    'ZCLDataType': 'ZCL_DATE_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '226': {
    'ZCLDataType': 'ZCL_UTC_TIME_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '232': {
    'ZCLDataType': 'ZCL_CLUSTER_ID_ATTRIBUTE_TYPE',
    'bytes': 2
  },
  '233': {
    'ZCLDataType': 'ZCL_ATTRIBUTE_ID_ATTRIBUTE_TYPE',
    'bytes': 2
  },
  '234': {
    'ZCLDataType': 'ZCL_BACNET_OID_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '240': {
    'ZCLDataType': 'ZCL_IEEE_ADDRESS_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '241': {
    'ZCLDataType': 'ZCL_SECURITY_KEY_ATTRIBUTE_TYPE',
    'bytes': null
  },
  '255': {
    'ZCLDataType': 'ZCL_UNKNOWN_ATTRIBUTE_TYPE',
    'bytes': null
  }
};

module.exports = ZCLDataTypes;
