# peoplecounter

## Getting Started
* Setup server by following [these steps](https://github.com/Domiii/node-sample-app)
* Import Database:
  - Download.
  - Create new folder `backup/`
  - Extract *.sql file to `backup/*.sql`
  - Go to folder `bin`: `cd bin`
  - Run: `sh import.sh` [To import the sql file. This might take a few hours.]

Tables:

	CREATE TABLE `users` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `username` varchar(45) COLLATE utf8_unicode_ci NOT NULL,
	  `password` char(64) COLLATE utf8_unicode_ci NOT NULL,
	  `salt` char(16) COLLATE utf8_unicode_ci NOT NULL,
	  `iterations` int(11) NOT NULL,
	  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	  `algo` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `session` char(40) COLLATE utf8_unicode_ci DEFAULT NULL,
	  PRIMARY KEY (`id`),
	  UNIQUE KEY `username_UNIQUE` (`username`)
	) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `clean` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `time` decimal(16,6) NOT NULL,
	  `mac` char(12) COLLATE utf8_unicode_ci NOT NULL,
	  `sigstr` smallint(6) NOT NULL,
	  `ssid` varchar(32) COLLATE utf8_unicode_ci DEFAULT NULL,
	  `dataset` varchar(1024) COLLATE utf8_unicode_ci NOT NULL,
	  `device` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `seqnum` smallint(5) unsigned NOT NULL,
	  PRIMARY KEY (`id`),
	  KEY `mac` (`mac`),
	  KEY `ssid` (`ssid`),
	  KEY `device` (`device`)
	) ENGINE=InnoDB AUTO_INCREMENT=5520870 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `data` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `time` decimal(16,6) NOT NULL,
	  `mac` char(12) COLLATE utf8_unicode_ci NOT NULL,
	  `sigstr` smallint(6) NOT NULL,
	  `ssid` varchar(32) COLLATE utf8_unicode_ci DEFAULT NULL,
	  `file` varchar(1024) COLLATE utf8_unicode_ci NOT NULL,
	  `device` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `seqnum` smallint(5) unsigned NOT NULL,
	  `dataset` int(11) NOT NULL,
	  `prefix` char(6) COLLATE utf8_unicode_ci NOT NULL,
	  PRIMARY KEY (`id`),
	  KEY `device` (`device`),
	  KEY `dset` (`dataset`),
	  KEY `mac` (`mac`,`dataset`),
	  KEY `time` (`dataset`,`time`),
	  KEY `time2` (`time`),
	  KEY `devtime` (`dataset`,`time`,`mac`),
	  KEY `ssid2` (`ssid`,`mac`,`dataset`),
	  KEY `ssid` (`ssid`,`dataset`),
	  KEY `devtime2` (`dataset`,`time`,`device`,`mac`),
	  CONSTRAINT `dset2` FOREIGN KEY (`dataset`) REFERENCES `datasets` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
	) ENGINE=InnoDB AUTO_INCREMENT=15565406 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `datasets` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `name` varchar(255) NOT NULL,
	  PRIMARY KEY (`id`)
	) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;


	# Organizationally Unique Identifier
	CREATE TABLE `oui` (
	  `mac` char(12) COLLATE utf8_unicode_ci NOT NULL,
	  `model` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `company` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
	  PRIMARY KEY (`mac`)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `ssid` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `ssid` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
	  `lat` double DEFAULT NULL,
	  `lon` double DEFAULT NULL,
	  PRIMARY KEY (`id`),
	  UNIQUE KEY `ssid_UNIQUE` (`ssid`)
	) ENGINE=InnoDB AUTO_INCREMENT=70262 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `cpu` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `value` int(11) NOT NULL,
	  `time` decimal(17,3) NOT NULL,
	  `interval` int(11) NOT NULL,
	  `host` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `cpunum` tinyint(3) unsigned NOT NULL,
	  `type` enum('wait','interrupt','softirq','steal','user','nice','system','idle') COLLATE utf8_unicode_ci NOT NULL,
	  PRIMARY KEY (`id`)
	) ENGINE=InnoDB AUTO_INCREMENT=545498 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `devices` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `device` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `password` char(64) COLLATE utf8_unicode_ci NOT NULL,
	  `salt` char(16) COLLATE utf8_unicode_ci NOT NULL,
	  `iterations` int(11) NOT NULL,
	  `algo` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `lastseen` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
	  `lat` float NOT NULL,
	  `lon` float NOT NULL,
	  `host` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  PRIMARY KEY (`id`)
	) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `files` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `value` int(11) NOT NULL,
	  `time` decimal(17,3) NOT NULL,
	  `interval` int(11) NOT NULL,
	  `host` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `type` enum('files','bytes') COLLATE utf8_unicode_ci NOT NULL,
	  PRIMARY KEY (`id`)
	) ENGINE=InnoDB AUTO_INCREMENT=2817660 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `ifaces` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `rx` int(11) NOT NULL,
	  `tx` int(11) NOT NULL,
	  `time` decimal(17,3) NOT NULL,
	  `interval` int(11) NOT NULL,
	  `host` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `iface` char(6) COLLATE utf8_unicode_ci NOT NULL,
	  `type` enum('if_octets','if_packets') COLLATE utf8_unicode_ci NOT NULL,
	  PRIMARY KEY (`id`)
	) ENGINE=InnoDB AUTO_INCREMENT=7035305 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `loadavg` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `avg01` decimal(3,2) NOT NULL,
	  `avg05` decimal(3,2) NOT NULL,
	  `avg15` decimal(3,2) NOT NULL,
	  `time` decimal(17,3) NOT NULL,
	  `interval` int(11) NOT NULL,
	  `host` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  PRIMARY KEY (`id`)
	) ENGINE=InnoDB AUTO_INCREMENT=1340715 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `login_attempts` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `device_id` int(11) DEFAULT NULL,
	  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	  `result` bit(1) NOT NULL,
	  `ip` int(10) unsigned NOT NULL,
	  PRIMARY KEY (`id`),
	  KEY `fk_new_table_1_idx` (`device_id`),
	  CONSTRAINT `devices` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
	) ENGINE=InnoDB AUTO_INCREMENT=1397391 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

	CREATE TABLE `mem` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `value` int(11) NOT NULL,
	  `time` decimal(17,3) NOT NULL,
	  `interval` int(11) NOT NULL,
	  `host` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  `type` enum('buffered','cached','used','free') COLLATE utf8_unicode_ci NOT NULL,
	  PRIMARY KEY (`id`)
	) ENGINE=InnoDB AUTO_INCREMENT=5634862 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
