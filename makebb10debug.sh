make clean all
cp  framework_config.json manifest.* *.html icon*.png deploy/macaw-enyo/
cp bb10/config.xml deploy/macaw-enyo/
cp bb10/index.html deploy/macaw-enyo/
cp splash* deploy/macaw-enyo/
rm deploy/macaw-enyo/icon.png
cd deploy/macaw-enyo/
zip -r ../../macawbb10.zip *
cd ..
cd ..
${BB10SDK}/bbwp macawbb10.zip -d
mv simulator/macawbb10.bar macawbb10-simulator.bar
mv device/macawbb10.bar macawbb10-device.bar
rm -R simulator
rm -R device
${BB10SDK}/dependencies/tools/bin/blackberry-deploy -installApp -launchApp ${BB10DEVICE} -password ${BB10DEVICEPASS} ./macawbb10-device.bar
