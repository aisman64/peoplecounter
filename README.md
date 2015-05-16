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


## OrientDB Experiment
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