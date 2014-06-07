APP			:= macaw
VENDOR		:= net.minego
APPID		:= $(VENDOR).$(APP)
PKG			:= Macaw
VERSION		:= 2.2.$(shell git log --pretty=format:'' | wc -l | sed 's/ *//')
DEPLOY		:= deploy/macaw-enyo
APK			:= Macaw-debug.apk
BAR			:= macaw-device.bar
ZIP			:= macaw.zip

clean:
	rm -rf *.ipk *.apk *.bar *.zip deploy build device simulator .tmp 2>/dev/null || true

${DEPLOY}:
	mkdir -p ${DEPLOY}
	cp -r assets enyo lib source package.js *.png ${DEPLOY}
	cp framework_config.json manifest.* *.html icon*.png ${DEPLOY}/
	cp  chrome/* ${DEPLOY}/
	(cd ${DEPLOY} && zip -r ../macaw-enyo.zip *)

release:
	rm -rf deploy build
	mkdir build
	./tools/deploy.sh
	cp  framework_config.json manifest.* *.html icon*.png ${DEPLOY}/
	cp  chrome/* ${DEPLOY}/
	rm -rf build
	(cd ${DEPLOY} && zip -r ../macaw-enyo.zip *)

${DEPLOY}/appinfo.json: ${DEPLOY} appinfo.json
	cat appinfo.json | sed -e s/autoversion/$(VERSION)/ > ${DEPLOY}/appinfo.json

${DEPLOY}/config.xml: ${DEPLOY} bb10/config.xml
	cat bb10/config.xml | sed -e s/autoversion/$(VERSION)/ > ${DEPLOY}/config.xml

deploy/${APPID}_${VERSION}_all.ipk: ${DEPLOY}/appinfo.json
	cat webos-index.html | sed 's/device-width/320/' > ${DEPLOY}/index.html
	cp macaw.png ${DEPLOY}
	palm-package --exclude=assets/old-images ${DEPLOY}

all: ${DEPLOY}

full-webos: clean release webos install

full-android: clean release android install

init:
	@git submodule init
	@git submodule update

initrepo:
	@git remote add upstream git://github.com/minego/macaw-enyo.git

initzip:
	@mkdir -p lib
	@curl -O https://codeload.github.com/enyojs/enyo/zip/master
	@unzip master
	@rm -rf enyo
	@mv enyo-master enyo
	@curl -O https://codeload.github.com/enyojs/onyx/zip/master
	@unzip master
	@rm -rf lib/onyx
	@mv onyx-master lib/onyx
	@curl -O https://codeload.github.com/enyojs/layout/zip/master
	@unzip master
	@rm -rf lib/layout
	@mv layout-master lib/layout

update:
	@git fetch upstream
	@git merge upstream/master

ipk: webos

webos: deploy/${APPID}_${VERSION}_all.ipk

openwebos: webos
	@scp -r ${DEPLOY} root@192.168.7.2:/usr/palm/applications/${APPID}

install:
	@(ls *.ipk 2>/dev/null && palm-install *.ipk)		|| \
	(ls *.apk 2>/dev/null && adb install -r *.apk)		|| \
	(ls *.bar 2>/dev/null && ${BB10SDK}/dependencies/tools/bin/blackberry-deploy -installApp ${BB10DEVICE} macaw-${BB10TYPE}.bar -password ${BB10DEVICEPASS})

launch: install
	@(ls *.ipk 2>/dev/null && palm-launch -i ${APPID})		|| \
	(ls *.bar 2>/dev/null && ${BB10SDK}/dependencies/tools/bin/blackberry-deploy -launchApp ${BB10DEVICE} macaw-${BB10TYPE}.bar)

log:
	@(																		\
		ls *.ipk 2>/dev/null &&												\
		palm-log -f ${APPID} | sed -u										\
			-e 's/\[[0-9]*-[0-9]*:[0-9]*:[0-9]*\.[0-9]*\] [a-zA-Z]*: //'	\
			-e 's/indicated new content, but not active./\n\n\n/'			\
	) || (																	\
		ls *.apk 2>/dev/null &&												\
		adb logcat | grep "I\/Web Console"									\
	)

test: launch log
	@true


# Android build

${DEPLOY}/project.properties: ${DEPLOY}

android: ${APK}

apk: ${APK}

${APK}: ${DEPLOY}/project.properties ${DEPLOY}/appinfo.json
	@rm -rf .tmp 2>/dev/null || true
	@cp -r android .tmp
	@mkdir -p .tmp/assets/www/
	@cp -r ${DEPLOY}/* .tmp/assets/www/
	@cp android/*.js android/*.html .tmp/assets/www/
	@cp icon128.png .tmp/res/drawable/icon.png
	@(cd .tmp && ant debug)
	@mv .tmp/bin/$(APK) .

bar: ${DEPLOY}/config.xml
	@cp framework_config.json *.html icon*.png ${DEPLOY}/
	@(cd ${DEPLOY} && zip -r ../../${ZIP} *)
	# TODO Allow signing with a real key
	@${BB10SDK}/bbwp -d ${ZIP}
	@rm ${ZIP}
	@mv simulator/macaw.bar macaw-simulator.bar
	@mv device/macaw.bar macaw-device.bar
	@rmdir simulator
	@rmdir device

barsigned: ${DEPLOY}/config.xml
	@cp framework_config.json *.html icon*.png ${DEPLOY}/
	@(cd ${DEPLOY} && zip -r ../../${ZIP} *)
	@${BB10SDK}/bbwp -g ${BB10SIGNPASS} ${ZIP}
	@rm ${ZIP}
	@mv simulator/macaw.bar macaw-simulator.bar
	@mv device/macaw.bar macaw-device.bar
	@rmdir simulator
	@rmdir device

macaw-simulator.bar: bar

macaw-device.bar: bar

bb10: bar

.PHONY: clean webos install launch log test release apk ipk android bar
