# Optimization hints
# Partitioning + using MyISAM: http://stackoverflow.com/a/511966/2228771

# Time sampling (using 60 second time slices):
# SELECT COUNT(*) c, ROUND(`time` - ROUND(`time`) % 60) t FROM `data` WHERE macid = 11015 GROUP BY `t` ORDER BY `t` LIMIT 30;
# SELECT COUNT(*) c, `macId`, ROUND(`time` - ROUND(`time`) % 60) t FROM `data` GROUP BY `macId`, `t` ORDER BY `macId`, `t` LIMIT 30;

# Most active SSIDs
# SELECT c count, ssidName FROM (SELECT COUNT(*) c, ssidId s FROM WifiSSIDPacket GROUP BY ssidId ORDER BY c DESC LIMIT 10) j INNER JOIN (SSID) ON (s = ssidId);


# Most active MACAddresses
# SELECT COUNT(*) c, macId m FROM WifiSSIDPacket GROUP BY macId ORDER BY c DESC LIMIT 10;

# Export data
# mysqldump --opt --where="1 limit 10000" --user=USER --password=PW DB > "db.sql"



###################################################################################################
# move and rename tables
###################################################################################################

CREATE DATABASE `peoplecounter`;

ALTER TABLE project.data RENAME peoplecounter.WifiSSIDPacket;
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

ALTER TABLE WifiSSIDPacket CHANGE id packetId INTEGER UNSIGNED AUTO_INCREMENT;
ALTER TABLE WifiSSIDPacket CHANGE sigstr signalStrength INTEGER;
ALTER TABLE WifiSSIDPacket CHANGE dataset datasetId INTEGER UNSIGNED;

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
    `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `createdAt` DATETIME ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`macId`)
);

INSERT INTO `MACAddress` (`macAddress`) (
    SELECT DISTINCT `mac` FROM `WifiSSIDPacket`
);

# insert missing ssids into SSID table
# see: http://www.codeproject.com/KB/database/Visual_SQL_Joins/Visual_SQL_JOINS_orig.jpg
INSERT INTO `SSID` (`ssidName`) (
    SELECT `ssidName`
    FROM (SELECT DISTINCT `ssid` FROM WifiSSIDPacket) W
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
# convert all kinds of names to ids in WifiSSIDPacket table
###################################################################################################

# convert `device` string to `deviceId`
ALTER TABLE WifiSSIDPacket ADD `deviceId` INTEGER UNSIGNED;

UPDATE `WifiSSIDPacket`
INNER JOIN `WifiSnifferDevice`
ON `WifiSnifferDevice`.`host` = `WifiSSIDPacket`.`device`
SET `WifiSSIDPacket`.`deviceId` = `WifiSnifferDevice`.`id`;

CREATE INDEX WifiSSIDPacket_deviceId ON WifiSSIDPacket (deviceId);

# convert `mac` string to `macId`
ALTER TABLE WifiSSIDPacket ADD `macId` INTEGER UNSIGNED;

UPDATE `WifiSSIDPacket`
INNER JOIN `MACAddress`
ON `MACAddress`.`macAddress` = `WifiSSIDPacket`.`mac`
SET `WifiSSIDPacket`.`macId` = `MACAddress`.`macId`;

CREATE INDEX WifiSSIDPacket_macId ON WifiSSIDPacket (macId);

# convert `ssid` string to `ssidId`
ALTER TABLE WifiSSIDPacket ADD `ssidId` INTEGER UNSIGNED;

UPDATE `WifiSSIDPacket`
INNER JOIN `SSID`
ON `SSID`.`ssidName` = `WifiSSIDPacket`.`ssid`
SET `WifiSSIDPacket`.`ssidId` = `SSID`.`ssidId`;

CREATE INDEX WifiSSIDPacket_ssidId ON WifiSSIDPacket (ssidId);

SHOW INDEX FROM WifiSSIDPacket;

# All WifiSSIDPackets have a valid deviceId!
# All WifiSSIDPackets have a valid macId!
# NOTE: Not all WifiSSIDPackets have a valid ssidId!
SELECT COUNT(*) FROM WifiSSIDPacket WHERE (deviceId IS NULL OR macId IS NULL); # == 0


###################################################################################################
# Get distinct (macId, ssidId) pairs
###################################################################################################

CREATE TABLE `MAC_SSID_Relation` (
    `relationId` INT(11) NOT NULL AUTO_INCREMENT,
    `macId` INT(11) NOT NULL,
    `ssidId` CHAR(12) NOT NULL,
    `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `createdAt` DATETIME ON UPDATE CURRENT_TIMESTAMP,
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
    FROM WifiSSIDPacket
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

#ALTER TABLE WifiSSIDPacket DROP COLUMN `device` UNSIGNED;
#ALTER TABLE WifiSSIDPacket DROP COLUMN `mac` UNSIGNED;
#ALTER TABLE WifiSSIDPacket DROP COLUMN `ssid` UNSIGNED;
#ALTER TABLE WifiSSIDPacket DROP COLUMN `file` UNSIGNED;
#ALTER TABLE WifiSSIDPacket DROP COLUMN `prefix` UNSIGNED;

#DELETE FROM ssid WHERE ssidName IS NULL;


###################################################################################################
# new stuff
###################################################################################################

ALTER TABLE WifiSnifferDevice ADD currentDatasetId INTEGER UNSIGNED;
ALTER TABLE WifiSnifferDevice ADD currentJobType INTEGER UNSIGNED;


# link OUI information to MACAddress table
ALTER TABLE MACAddress ADD `macAnnotation` TEXT;
ALTER TABLE MACAddress ADD ouiId INTEGER UNSIGNED;


ALTER TABLE OUI DROP PRIMARY KEY;
ALTER TABLE OUI ADD ouiId INTEGER UNSIGNED NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (ouiId), AUTO_INCREMENT=1;

UPDATE `MACAddress` m
INNER JOIN `OUI` o
ON (m.macAddress LIKE CONCAT(o.mac, '%'))
SET m.ouiId = o.ouiId;


# convert time to BIGINT
ALTER TABLE `WifiSSIDPacket` ADD `time2` DATETIME(6);

UPDATE `WifiSSIDPacket`
SET `time2` = FROM_UNIXTIME(time);

CREATE INDEX WifiSSIDPacket_time2 ON WifiSSIDPacket (time2);
CREATE INDEX WifiSSIDPacket_time2_macId ON WifiSSIDPacket (time2, macId);