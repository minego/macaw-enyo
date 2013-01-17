APP			:= macaw
VENDOR		:= net.minego
APPID		:= $(VENDOR).$(APP)
PKG			:= Macaw
VERSION		:= 2.2.$(shell git log --pretty=format:'' | wc -l | sed 's/ *//')
DEPLOY		:= deploy/macaw
APK			:= Macaw-debug.apk

clean:
	rm -rf *.ipk deploy build .tmp 2>/dev/null || true

${DEPLOY}:
	rm -rf deploy build
	mkdir -p deploy/macaw
	cp -r assets enyo lib source package.js *.png framework_config.json deploy/macaw/
	cp debug.html deploy/macaw/index.html

release:
	rm -rf deploy build
	mkdir build
	./tools/deploy.sh

${DEPLOY}/appinfo.json: ${DEPLOY}
	cat appinfo.json | sed -e s/autoversion/$(VERSION)/ > ${DEPLOY}/appinfo.json

deploy/${APPID}_${VERSION}_all.ipk: ${DEPLOY}/appinfo.json
	palm-package --exclude=assets/old-images ${DEPLOY}

all: ${DEPLOY}

full: clean release install

init:
	@git submodule init
	@git submodule update

initrepo:
	@git remote add upstream git://github.com/dkirker/macaw-enyo.git

update:
	@git fetch upstream
	@git merge upstream/master

ipk: webos

webos: deploy/${APPID}_${VERSION}_all.ipk

openwebos: webos
	@scp -r deploy/macaw root@192.168.7.2:/usr/palm/applications/${APPID}

install:
	@(ls *.ipk 2>/dev/null && palm-install *.ipk) || (ls *.apk 2>/dev/null && adb install -r *.apk)

launch: install
	@palm-launch -i ${APPID}

log:
	@(																		\
		ls *.ipk 2>/dev/null &&												\
		-palm-log -f ${APPID} | sed -u										\
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
	@cp -r ${DEPLOY}/* .tmp/assets/www/
	@cp android/*.js android/*.html .tmp/assets/www/
	@cp icon128.png .tmp/res/drawable/icon.png
	@(cd .tmp && ant debug)
	@mv .tmp/bin/$(APK) .

.PHONY: clean webos install launch log test release apk ipk android

