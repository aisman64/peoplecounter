-- Most often used mac addresses in `clean`: count, macId
-- 102139, 12742
-- 37756, 8429
-- 36731, 166
-- 34138, 11013
-- 29649, 8815
-- 28556, 8878
-- 23694, 11015
-- 21550, 353
-- 17363, 3597
-- 13489, 8967

-- Time sampling (using 60 second time slices):
-- SELECT COUNT(*) c, ROUND(`time` - ROUND(`time`) % 60) t FROM `data` WHERE macid = 11015 GROUP BY `t` ORDER BY `t` LIMIT 30;
-- SELECT COUNT(*) c, `macId`, ROUND(`time` - ROUND(`time`) % 60) t FROM `data` GROUP BY `macId`, `t` ORDER BY `macId`, `t` LIMIT 30;

# Most active SSIDs
# SELECT c count, ssidName FROM (SELECT COUNT(*) c, ssidId s FROM WifiPacket GROUP BY ssidId ORDER BY c DESC LIMIT 10) j INNER JOIN (SSID) ON (s = ssidId);


# Most active MACAddresses
# SELECT COUNT(*) c, macId m FROM WifiPacket GROUP BY macId ORDER BY c DESC LIMIT 10;

# Export data
# mysqldump --opt --where="1 limit 10000" --user=USER --password=PW DB > "db.sql"



###################################################################################################
# move and rename tables
###################################################################################################

CREATE DATABASE `peoplecounter`;

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

ALTER TABLE WifiPacket CHANGE id packetId INTEGER UNSIGNED AUTO_INCREMENT;
ALTER TABLE WifiPacket CHANGE sigstr signalStrength INTEGER;
ALTER TABLE WifiPacket CHANGE dataset datasetId INTEGER UNSIGNED;

ALTER TABLE WifiDataset CHANGE id datasetId INTEGER UNSIGNED AUTO_INCREMENT;
ALTER TABLE WifiDataset CHANGE name datasetName varchar(255);

ALTER TABLE WifiSnifferDevice CHANGE id deviceId INTEGER UNSIGNED AUTO_INCREMENT;
ALTER TABLE WifiSnifferDevice CHANGE device deviceName varchar(255);
ALTER TABLE WifiSnifferDevice ADD uid INTEGER UNSIGNED;
ALTER TABLE WifiSnifferDevice ADD identityToken varchar(256);
ALTER TABLE WifiSnifferDevice ADD rootPassword varchar(256);
ALTER TABLE WifiSnifferDevice ADD isAssigned INTEGER UNSIGNED;
ALTER TABLE WifiSnifferDevice ADD resetTimeout DATETIME;
ALTER TABLE WifiSnifferDevice CHANGE host hostName varchar(255);
ALTER TABLE WifiSnifferDevice ADD `createdAt` DATETIME;
ALTER TABLE WifiSnifferDevice ADD `updatedAt` DATETIME;

ALTER TABLE SSID CHANGE id ssidId INTEGER UNSIGNED AUTO_INCREMENT;
ALTER TABLE SSID CHANGE ssid ssidName varchar(32);

ALTER TABLE OUI ADD `updatedAt` DATETIME;
ALTER TABLE OUI ADD `createdAt` DATETIME;


###################################################################################################
# add missing names to name lookup tables
###################################################################################################

# create and fill MacAddress table
CREATE TABLE `MACAddress` (
	`macId` INT(11) NOT NULL AUTO_INCREMENT,
	`macAddress` CHAR(12) NOT NULL,
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
# add one user for each device
###################################################################################################

INSERT INTO `User` (`userName`) (
    SELECT CONCAT('dev_', `deviceName`) FROM `WifiSnifferDevice`
);

UPDATE `WifiSnifferDevice` d
INNER JOIN `User` u
ON (CONCAT('dev_', d.deviceName) = u.userName)
SET d.uid = u.uid, role = 3, displayRole = 3;

ALTER TABLE `WifiSnifferDevice` DROP COLUMN deviceName;


###################################################################################################
# convert all kinds of names to ids in WifiPacket table
###################################################################################################

# convert `device` string to `deviceId`
ALTER TABLE WifiPacket ADD `deviceId` INTEGER UNSIGNED;

UPDATE `WifiPacket`
INNER JOIN `WifiSnifferDevice`
ON `WifiSnifferDevice`.`host` = `WifiPacket`.`device`
SET `WifiPacket`.`deviceId` = `WifiSnifferDevice`.`id`;

CREATE INDEX WifiPacket_deviceId ON WifiPacket (deviceId);

# convert `mac` string to `macId`
ALTER TABLE WifiPacket ADD `macId` INTEGER UNSIGNED;

UPDATE `WifiPacket`
INNER JOIN `MACAddress`
ON `MACAddress`.`macAddress` = `WifiPacket`.`mac`
SET `WifiPacket`.`macId` = `MACAddress`.`macId`;

CREATE INDEX WifiPacket_macId ON WifiPacket (macId);

# convert `ssid` string to `ssidId`
ALTER TABLE WifiPacket ADD `ssidId` INTEGER UNSIGNED;

UPDATE `WifiPacket`
INNER JOIN `SSID`
ON `SSID`.`ssidName` = `WifiPacket`.`ssid`
SET `WifiPacket`.`ssidId` = `SSID`.`ssidId`;

CREATE INDEX WifiPacket_ssidId ON WifiPacket (ssidId);

SHOW INDEX FROM WifiPacket;

# All WifiPackets have a valid deviceId!
# All WifiPackets have a valid macId!
# NOTE: Not all WifiPackets have a valid ssidId!
SELECT COUNT(*) FROM WifiPacket WHERE (deviceId IS NULL OR macId IS NULL); # == 0


###################################################################################################
# Get distinct (macId, ssidId) pairs
###################################################################################################

CREATE TABLE `MAC_SSID_Relation` (
    `relationId` INT(11) NOT NULL AUTO_INCREMENT,
    `macId` INT(11) NOT NULL,
    `ssidId` CHAR(12) NOT NULL,
    `updatedAt` DATETIME,
    `createdAt` DATETIME,
    PRIMARY KEY (`relationId`)
);

-- ALTER TABLE MAC_SSID_Relation ADD `updatedAt` DATETIME;
-- ALTER TABLE MAC_SSID_Relation ADD `createdAt` DATETIME;
-- DELETE FROM MAC_SSID_Relation WHERE ssidId = 51773;

CREATE INDEX MAC_SSID_Relations_macId ON MAC_SSID_Relations (macId);
CREATE INDEX MAC_SSID_Relations_ssidId ON MAC_SSID_Relations (ssidId);
CREATE INDEX MAC_SSID_Relations_macId_ssidId ON MAC_SSID_Relations (macId, ssidId);

INSERT INTO MAC_SSID_Relations (macId, ssidId) (
    SELECT DISTINCT macId, ssidId
    FROM WifiPacket
    WHERE ssidId IS NOT NULL
    GROUP BY macId, ssidId
);



#DONE!?

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

#DELETE FROM ssid WHERE ssidName IS NULL;


###################################################################################################
# new stuff
###################################################################################################

ALTER TABLE WifiSnifferDevice ADD currentDatasetId INTEGER UNSIGNED;
ALTER TABLE WifiSnifferDevice ADD currentJobType INTEGER UNSIGNED;