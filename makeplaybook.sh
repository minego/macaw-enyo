rm -rf deploy build
mkdir build
./tools/deploy.sh
cp  framework_config.json manifest.* *.html icon*.png deploy/macaw-enyo/
cp bbplaybook/config.xml deploy/macaw-enyo/
rm deploy/macaw-enyo/icon.png
cd deploy/macaw-enyo/
zip -r ../../macawplaybook.zip *
