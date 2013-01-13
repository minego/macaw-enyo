Project Macaw 2
================================================================================

This is an early port of the Project Macaw twitter app from Mojo to Enyo 2

================================================================================

Author: 	Micah N Gorrell
Twitter:	@_minego
Email: 		macaw@minego.net
Web:		http://minego.net


Building
================================================================================

This application can simply be run in a browser, but may also be minified and
packaged for webOS. Packaging for other platforms may be included in the future.

Building requires gnu make. Minifying requires nodejs.

Deploy as debug:
	make clean all

Deploy release (minified):
	make clean release all

Package for webOS:
	make webos

Install package on a webOS device:
	make install

Test on webOS device:
	make test


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

