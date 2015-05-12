# peoplecounter


## Getting Started
* Setup server by following [these steps](https://github.com/Domiii/node-sample-app)
* Import Database to MySQL:
	* Download the database (currently not public)
	* Create new folder `backup/`
	* Extract `*.sql` file to `backup/*.sql`
	* Go to `bin/` folder: `cd bin`
	* Run: `sh import.sh` [To import the sql file. This might take a few hours.]
* Deploying a device:
	* Start server
	* Go to "Device" page
	* Setup device
		* Download an image file (if you have not done so before) and copy it to the device (tested only on Galileo)
		* Boot up the device
		* Once it has finished initializing, it will connect to the server.
	* Add a new device configuration through the "Add device" button, give it a new name and hit "Apply"
		* Make sure that it is currently in the "reset pending" state. If not, hit "Reset"
		* Upon the next connection attempt, your (Galileo) device will be assigned the first configuration with "reset pending" state
		* From then on, the device will use that configuration to authenticate and communicate with the server (until you reset it again)
	* Once initialized and authenticated, the device will start capturing packets and send them to the server
	* TODO: More info and diagrams here


## Interesting data to look into
 * AP tracker
 * Detect general people movement
 * Cluster by (time and) well known public places (Coffee shops, schools, companies, hotels, airports, temples etc.)
 * Wi-fi abused for app- or device-specific beacons (e.g. [Nintendo 3DS](http://sc-wifi.com/2012/11/) and [Onavo](https://github.com/rixgit/wifisniff))
 * Look at relationships through private SSIDs used by very few people (two to five) and also look at timestamps?

## References
 * [Peoplecounter presentation (2014)](https://www.dropbox.com/s/m3m5ru1kpifgv4s/Peoplecounter2.pptx?dl=0)
 * [Signals from the Crowd: Uncovering Social Relationships through Smartphone Probes](http://conferences.sigcomm.org/imc/2013/papers/imc148-barberaSP106.pdf)
 * [Inferring User Relationship from Hidden Information in WLANs](http://spirit.cs.ucdavis.edu/pubs/conf/Ningning_MILCOM12.pdf)
 * [YOUR MOBILE PHONE IS A TRAITOR! – RAISING AWARENESS ON UBIQUITOUS PRIVACY ISSUES WITH SASQUATCH](https://uhdspace.uhasselt.be/dspace/bitstream/1942/17224/1/bonne14sasquatch.pdf)


## OrientDB Experiment (IGNORE THIS FOR NOW)
To better support graph-analysis on large datasets, we might want to eventually migrate toward OrientDB.

To get it working:

* [Download and install the Java SDK](http://www.oracle.com/technetwork/java/javase/downloads/)
* Add the Java SDK to your PATH
* [Download OrientDB](http://orientdb.com/download/) and extract/install it to your programs folders
* Create a shortcut to `OrientDB\bin\server.sh` (or `server.bat` on Windows) on your Desktop (or wherever)
* Create a shortcut to `OrientDB\bin\console.sh` (or `console.bat` on Windows) on your Desktop (or wherever)
* Run `server` to start your DB
* (Run `console` to [connect to your DB](http://orientdb.com/docs/last/Tutorial-Run-the-console.html) and play with it)
* You might want to take a look at [their manual](http://orientdb.com/docs/last/index.html)