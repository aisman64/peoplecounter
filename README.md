# peoplecounter


## Getting Started
* Setup node web server by following [these steps](https://github.com/Domiii/node-sample-app)
* Import Database to MySQL:
	* Download the database (currently not public)
	* Create new folder `backup/`
	* Extract `*.sql` file to `backup/*.sql`
	* Go to `bin/` folder: `cd bin`
	* Run: `sh import.sh` [To import the sql file. This might take a few hours.]
* Deploying a device:
	* Start node web server
		* Make sure, your DB server is running
		* Go to `server` folder
		* Run `npm start`
	* Setup device (tested only on Galileo)
                * Connect your device to a network (wired or wireless)
		* Boot up the device
		* Make sure to copy the [deviceClient/ folder](https://github.com/aisman64/peoplecounter/tree/master/deviceClient) to the device
			* Optional: Register `StartDeviceClient.js` as a system service (so it will auto-reconnect on boot-up)
		* Create a [config file](#Config_File) (Default path: `./data/DeviceConfig.json`). Make sure to double check the `HostUrl` setting.
		* If not running yet, run `node StartDeviceClient.js`
		* The device will now continuously try connecting to the server
	* Add new device to server
		* Connect to the web interface using any browser
		* Go to "Device" page
		* Add a new device configuration through the "Add device" button, give it a new name and hit "Apply"
		* Make sure that it is currently in the "reset pending" state. If not, hit "Reset"
		* Upon the next connection attempt, your (Galileo) device will be assigned the first configuration with "reset pending" state
		* From then on, the device will use that configuration to authenticate and communicate with the server (until you reset it again)
	* Once initialized and authenticated, the device will start capturing packets and send them to the server
	* TODO: More info and diagrams here


## Default Config File

```js
{
	DeviceClientCacheFile: "./data/_ClientCache",
	ReconnectDelay: 3000,
	HostUrl: "http://localhost:9123"
}
```

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
