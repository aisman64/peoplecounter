###################################################################################################
# move and rename tables
###################################################################################################

ALTER TABLE project.data RENAME peoplecounter.WifiPacket;
ALTER TABLE project.datasets RENAME peoplecounter.WifiDataset;
ALTER TABLE project.ssid RENAME peoplecounter.SSID;
ALTER TABLE project.oui RENAME peoplecounter.OUI;

ALTER TABLE devices.devices RENAME peoplecounter.WifiSnifferDevice;
ALTER TABLE devices.cpu RENAME peoplecounter.WifiSnifferDeviceCpu;
ALTER TABLE devices.mem RENAME peoplecounter.WifiSnifferDeviceMem;
ALTER TABLE devices.ifaces RENAME peoplecounter.WifiSnifferDeviceNetwork;
ALTER TABLE devices.loadavg RENAME peoplecounter.WifiSnifferDeviceLoadAverage;

ALTER TABLE devices.files RENAME peoplecounter.TmpFiles;


USE `peoplecounter`;

###################################################################################################
# rename columns
###################################################################################################

ALTER TABLE WifiPacket CHANGE id packetId;
ALTER TABLE WifiPacket CHANGE sigstr signalStrength;

ALTER TABLE WifiDataset CHANGE COLUMN dataset datasetName;

ALTER TABLE WifiSnifferDevice CHANGE COLUMN id deviceId;
ALTER TABLE WifiSnifferDevice CHANGE COLUMN device deviceName;

ALTER TABLE SSID CHANGE COLUMN id ssidId;
ALTER TABLE SSID CHANGE COLUMN ssid ssidName;


###################################################################################################
# add missing names to name lookup tables
###################################################################################################

# create and fill MacAddress table
CREATE TABLE `MACAddress` (
	macId int(11) NOT NULL AUTO_INCREMENT,
	macAddress char(16) NOT NULL
    PRIMARY KEY (`macId`)
);

INSERT INTO `MACAddress` (`macAddress`) (
	SELECT DISTINCT `mac` FROM `WifiPacket`
);

# insert missing ssids into SSID table
# see: http://www.codeproject.com/KB/database/Visual_SQL_Joins/Visual_SQL_JOINS_orig.jpg
INSERT INTO `SSID` (`ssidName`) (
	SELECT `ssidName`
	FROM (SELECT DISTINCT `ssid` FROM WifiPacket) W
	LEFT JOIN `SSID`
	ON W.ssid = SSID.ssidName
	WHERE SSID.ssidName IS NULL
);


###################################################################################################
# convert all kinds of names to ids in WifiPacket table
###################################################################################################

# convert `device` string to `deviceId`
ALTER TABLE WifiPacket ADD `deviceId` INTEGER UNSIGNED;

UPDATE `WifiPacket`
INNER JOIN `WifiSnifferDevice`
ON `WifiSnifferDevice`.`deviceName` = `WifiPacket`.`device`
SET `WifiPacket`.`deviceId` = `WifiSnifferDevice`.`deviceId`;


# convert `mac` string to `macId`
ALTER TABLE WifiPacket ADD `macId` INTEGER UNSIGNED;

UPDATE `WifiPacket`
INNER JOIN `MACAddress`
ON `MACAddress`.`macAddress` = `WifiPacket`.`mac`
SET `WifiPacket`.`macId` = `MACAddress`.`macId`;


# convert `ssid` string to `ssidId`
ALTER TABLE WifiPacket ADD `ssidId` INTEGER UNSIGNED;

UPDATE `WifiPacket`
INNER JOIN `SSID`
ON `SSID`.`ssid` = `WifiPacket`.`ssid`
SET `WifiPacket`.`ssidId` = `SSID`.`ssidId`;


# TODO: Make sure, all WifiPackets have a valid deviceId!
# TODO: Make sure, all WifiPackets have a valid macId!
# TODO: Make sure, all WifiPackets have a valid ssidId!
SELECT * FROM WifiPacket WHERE (deviceId IS NULL OR macId IS NULL OR ssidId IS NULL);


###################################################################################################
# delete unused/useless stuff
###################################################################################################
#DROP DATABASE `auth`;
#DROP DATABASE `project`;
#DROP DATABASE `devices`;

#ALTER TABLE WifiPacket DROP COLUMN `device` UNSIGNED;
#ALTER TABLE WifiPacket DROP COLUMN `mac` UNSIGNED;
#ALTER TABLE WifiPacket DROP COLUMN `ssid` UNSIGNED;
#ALTER TABLE WifiPacket DROP COLUMN `file` UNSIGNED;
#ALTER TABLE WifiPacket DROP COLUMN `prefix` UNSIGNED;