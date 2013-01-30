macaw-enyo
================================================================================

"Squawk!"
--------------------------------------------------------------------------------


This is an early port of the Project Macaw twitter app from Mojo to Enyo 2, and
when I say "port" I mean "not a port at all, because it is a rewrite from
scratch".


--------------------------------------------------------------------------------


* Author: 	Micah N Gorrell
* Twitter:	@_minego
* Email		macaw@minego.net
* Web:		http://minego.net


Building
================================================================================

This application relies on a number of git sub modules. After checking out you
must run:

	git submodule update --init


This application can currently be packaged for chrome, webOS and android.
Packaging for other platforms may be included in the future.

Building requires gnu make. Minifying requires nodejs.

### Deploy as debug:
	make clean all

### Deploy release (minified):
	make clean release all

### Package for webOS:
	make webos

### Package for android
	make android

### Package for BB10 (Requires the bbwp tool from the BB10 Webworks SDK)
	export BB10SDK=/path/to/bb10/sdk
	make bar

### Install package on a webOS or android device:
	make install

### Install package on a BB10 devices
	export BB10SDK=/path/to/bb10/sdk
	export BB10DEVICE="ip of bb10 device"
	export BB10TYPE="simulator or device"
	make install

### View logs on a webOS or android device
	make log

### Running as a chrome application:
	* Navigate to "chrome:extensions"
	* Click "Load unpacked extension"
	* Select the directory where you checked out the macaw-enyo source

Macaw License
================================================================================

You may do whatever you want with this source code with the following conditions:
 1.	You may not use reproductions, distributions, modifications, or any part of
	this source code or included images, graphics, or other media for commercial
	purposes

 2.	You may not use the name "Macaw" or the name of any contributor in a manner
	that implies endorsement or "official" involvement.

 3.	You must retain this license notice.

Email license@minego.net if you need an exception made to the license.

Copyright 2013 Micah N Gorrell


