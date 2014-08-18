/*
	Copyright (c) 2010, Micah N Gorrell
	All rights reserved.

	THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
	WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
	EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
	OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
	OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
	ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

enyo.kind({

name:									"MessageList",
classes:								"messagelist enyo-fit",

published: {
	user:								null,

	resource:							"home",

	refreshTime:						-1,
	notify:								false,
	cache:								false,

	unseen:								0,
	type:								null,
	label:								null,

	/*
		Minimum number of pixels that the list must be pulled down before a
		refresh will be triggered in order to prevent accidental refreshes.
	*/
	minRefreshPixels:					40,

	/* Will be set to true if the panel is in the middle of a refresh already */
	loading:							false
},

events: {
	onRefreshStart:						"",
	onRefreshStop:						"",
	onOpenToaster:						"",
	onActivity:							""
},

handlers: {
	onScroll:							"handleActivity"
},

components: [
	{
		name:							"list",
		kind:							enyo.PulldownList,
		classes:						"enyo-fit",

		ontap:							"itemTap",
		onSetupItem:					"setupItem",
		onSelect:						"setupItem",
		onPullRelease:					"pullRelease",
		onPullComplete:					"pullComplete",

		horizontal:						"hidden",
		vertical:						"scroll",

		thumb:							true,
		enableSwipe:					false,

		noSelect:						false,
		multiSelect:					false,

		preventDragPropagation:			false,
		preventScrollPropagation:		false,

		components: [{
			classes:					"listitem",

			components: [{
				name:					"msg",
				classes:				"hide"
			}, {
				name:					"message",
				kind:					"MessageItem"
			}, {
				name:					"cover",
				classes:				"cover enyo-fit"
			}]
		}]
	}
],

create: function()
{
	this.inherited(arguments);

	this.lastActivity = new Date();

	if (this.user) {
		this.service = this.user.service;
	}

    try {
        var info	= enyo.webOS.deviceInfo();
        var name    = info.modelNameAscii;

        if (name.indexOf("pre")  !== -1 ||
            name.indexOf("veer") !== -1 ||
            name.indexOf("pixi") !== -1)
		{
			/* Attempt to improve scrolling on webOS phones */
			this.$.list.setRowsPerPage(2);
		}
    } catch (e) {
    }

	if (window.android) {
		var strategy;

		this.$.list.setRowsPerPage(20);
		this.$.list.setStrategyKind("TranslateScrollStrategy");

		if ((strategy = this.$.list.getStrategy())) {
			/* This doesn't seem to help...  */
			// strategy.setScrim(true);

			/* This isn't published... */
			strategy.translateOptimized = true;
		}
	}
},

destroy: function()
{
	clearTimeout(this.timeout);

	this.inherited(arguments);
},

rendered: function()
{
	this.inherited(arguments);

	this.results		= [];

	/* Load cached messages */
	var results;

	if (this.cache) {
		/*
			Previous versions stored 2 copies of the messages in some cases. If
			cachedfull is there then use it and remove it from the cache.
		*/
		if ((results = prefs.get('cachedfull:' + this.user.id + ':' + this.resource))) {
			prefs.set('cachedfull:' + this.user.id + ':' + this.resource, null);
			prefs.set('cachedmsgs:' + this.user.id + ':' + this.resource, results);
		}

		results = prefs.get('cachedmsgs:' + this.user.id + ':' + this.resource) || [];
	} else {
		results = [];
	}

	try {
		this.service.cleanupMessages(results);
	} catch (e) {
		/* Throw away the cached items if cleaning them fails */
		console.log('Throwing away cached messages that can not be cleaned', e);
		results = [];
	}

	var cleanupItem = function(item) {
		if (item.media) {
			for (var c = 0, m; m = item.media[i]; i++) {
				if (m.blobthumbnail) {
					delete m.blobthumbnail;
				}
			}
		}

		if (item.user && item.user.blobavatar) {
			delete item.user.blobavatar;
		}
		if (item.real && item.real.user && item.real.user.blobavatar) {
			delete item.real.user.blobavatar;
		}
	};

	/* Remove any blob urls */
	for (var i = 0, item; item = results[i]; i++) {
		cleanupItem(item);
	}

	if (results && results.length) {
		this.loading = true;
		this.doRefreshStart();

		this.gotMessages(true, results, false);
	} else {
		this.refresh(false);
	}
},

pullRelease: function()
{
	setTimeout(enyo.bind(this, function() {
		this.pulled = true;
		this.refresh();
	}), 500);
},

pullComplete: function()
{
	this.$.list.reset();
},

/*
	autorefresh should be true if the refresh was initiated by a timer and not
	a human interaction.

	index is the offset where the new messages should be inserted.
*/
refresh: function(autorefresh, index)
{
	this.setTimer();

	if (this.loading) {
		setTimeout(this.refresh.bind(this), 1000);
		return;
	}
	// console.log('refreshing ' + this.name);

	if (autorefresh) {
		var at	= new Date(prefs.get('refreshAt:' + this.name));
		var now	= new Date();

		if (now < at) {
			this.log('Auto refresh tried to run too soon...', at, now, this.loaded);
			return;
		}
	}

	if (!autorefresh) {
		this.unseen = 0;
	}

	this.loading = true;
	this.doRefreshStart();

	var params = {
		include_entities: true
	};

	if (this.params) {
		for (var key in this.params) {
			params[key] = this.params[key];
		}
	}

	if (!this.results.length) {
		/* Load a reasonable amount */
		params.count = 50;

		/* It doesn't matter where we insert... */
		index = NaN;
	} else if (isNaN(index)) {
		/* Request a bit of an overlap in order to try to detect gaps */
		for (var i = 4; i >= 0; i--) {
			if (this.results[i] && this.results[i].id) {
				params.since_id = this.results[i].id;
				this.sinceIndex = i;
				break;
			}
		}

		if (!params.since_id) {
			/* Really? The most recent 5 items didn't have an id? Weird... */
			while (this.results.length && !this.results[0].id) {
				this.results.splice(0, 1);
			}

			if (this.results.length && this.results[0].id) {
				params.since_id = this.results[0].id;
			}
		}

		/* Load as many as possible to avoid gaps, max allowed is 200 */
		params.count = 200;
	} else {
		/*
			We're either trying to load messages at the end of the list, or
			trying to fill a gap.
		*/
		var prev	= this.results[index - 1];
		var next	= this.results[index + 1];

		if (prev && prev.id) {
			params.max_id = prev.id;
		}

		if (next && next.id) {
			params.since_id = next.id;
		} else {
			params.count = 50;
		}
	}

	this.service.getMessages(this.resource, enyo.bind(this, function(success, results) {
		this.removeIndicators(index, autorefresh,
			enyo.bind(this, function(insertIndex, newCountIndex, topIndex) {
				this.gotMessages(success, results, autorefresh, insertIndex);
			}
		));
	}), params);
},

/*
	Remove the new count and no message indicators

	Since this may change the offset of an index needed for insertion that index
	can be passed in, and a corrected index will be passed to the callback;
*/
removeIndicators: function(insertIndex, autorefresh, cb)
{
	var index			= NaN;
	var changed			= false;
	var topIndex		= this.$.list.getRowIndexFromCoordinate(48);

	// this.log(this.resource, 'topIndex is', topIndex);

	if (this.destroyed) {
		return;
	}

	for (var t, i = this.results.length - 1; t = this.results[i]; i--) {
		if (!t.loadFailed && isNaN(t.newcount)) {
			continue;
		}

		/* Keep track of where the new count indicator was */
		if (!isNaN(t.newcount)) {
			index = i;
		}

		/* Adjust other indexes if needed */
		if (i < insertIndex) {
			insertIndex--;
		}
		if (i < topIndex) {
			topIndex--;
		}

		/* Remove this indicator item */
		this.results.splice(i, 1);
		changed = true;
	}

	/*
		If the user triggered the refresh, or has scrolled since the last
		refresh then the position of the new count indicator is reset.
	*/
	if (!autorefresh || this.userIsActive) {
		index = NaN;
	}
	this.userIsActive = false;

	if (this.results.length > 0 && this.results[0].empty) {
		changed			= true;
		this.results	= [];

		topIndex		= 0;
		insertIndex		= NaN;
	}

	if (changed) {
		this.$.list.setCount(this.results.length);
		// this.$.list.refresh();
	}

	setTimeout(enyo.bind(this, function() {
		/* Scroll to the oldest new messages */
		this.lastActivity = new Date();
		this.$.list.scrollToRow(topIndex);

		if (cb) cb(insertIndex, index, topIndex);
	}), 300);
},

gotMessages: function(success, results, autorefresh, insertIndex, newCountIndex)
{
	var changed			= false;
	var reverseScroll	= false;
	var oldLength		= this.results.length;
	var topIndex		= 0;

	if (isNaN(topIndex)) {
		try {
			topIndex = this.$.list.getRowIndexFromCoordinate(48);
		} catch (e) {
			topIndex = 0;
		}
		this.log(this.resource, 'topIndex is', topIndex);
	}

	if (this.destroyed) {
		/*
			This can happen if the tabs are rebuilt while a refresh is in
			progress.
		*/
		return;
	}

	if (!success) {
		/*
			Failed

			Insert an indicator show that we failed to load new messages
		*/
		this.results.splice(insertIndex || 0, 0, {
			loadFailed: true
		});


		this.$.list.refresh();
		this.$.list.completePull();
		this.loading = false;

		this.doRefreshStop({
			count:		0,
			failed:		true
		});

		this.setTimer();

		return;
	}

	/* Keep track of when we last loaded */
	this.loaded = new Date();

	if (!isNaN(insertIndex) && this.results[insertIndex]) {
		if (!this.results[insertIndex].id) {
			this.results.splice(insertIndex, 1);

			changed = true;
		}

		if (insertIndex == this.results.length) {
			/* Scroll to the first new item, not the last */
			reverseScroll = true;
		}
	} else {
		insertIndex = NaN;
	}

	/*
		Gap detection

		We asked for 5 overlapping items to try to detect gaps, but twitter at
		times will return older items than we asked for too. If the new results
		have any items that match existing items then we have no gap.
	*/
	var match = true;
	// this.log(this.resource, 'Pre-gap  detection: There are ' + this.results.length + ' existing messages and ' + results.length + ' new messages');
	if (this.results.length > 0 && results.length > 0) {
		for (var n = 0, ni; ni = results[n]; n++) {
			for (var o = 0, oi; oi = this.results[o]; o++) {
				if (ni.id === oi.id) {
					/* We found a matching item, anything older is a duplicate */
					// this.log(this.resource, 'Removing duplicates from: ' + ni.id);
					match = true;

					if (isNaN(insertIndex)) {
						results.splice(n);
						break;
					} else {
						results.splice(n, 1);
					}
				}
			}
		}

		if (match) {
			/* We found our match, there is no gap */
			// this.log(this.resource, 'No gap, we had an overlap');
		} else {
			// this.log(this.resource, 'Found a gap');
			changed = true;

			/* We have a gap! */
			this.results.unshift({
				gap: {
					before:	this.results[0].id,
					after:	results[results.length - 1].id
				}
			});
		}
	}
	// this.log(this.resource, 'Post-gap detection: There are ' + this.results.length + ' existing messages and ' + results.length + ' new messages');

	/*
		Figure out where to put the new count indicator.

		If the list was refreshed automatically and the user hasn't interacted
		with it then the new count indicator should be left in the same spot and
		updated with a new value.

		If the user has interacted with the list or the user forced the refresh
		then only the count from this refresh should be included.
	*/
	var newcount = this.unseen;

	if (results.length && this.results.length && isNaN(insertIndex)) {
		newcount += results.length;
	}

	/* Display a notification for the most recent message */
	if (this.notify) {
		if (autorefresh && newcount > 0) {
			for (var i = Math.min(3, newcount), item; item = results[--i]; ) {
				var label	= null;
				var text	= null;
				var icon	= null;
				var n;

				switch (this.resource.toLowerCase()) {
					case 'mentions':
						label		= 'Mentioned by @' + item.user.screenname;
						text		= item.stripped;
						icon		= item.user.avatar;
						break;

					case 'messages':
						label		= 'Message from @' + item.user.screenname;
						text		= item.stripped;
						icon		= item.user.avatar;
						break;

					default:
						label		= 'New messages';
						text		= newcount + ' new messages';

						if (this.user.profile) {
							icon	= this.user.profile.avatar;
						}

						/* No need to continue, one notification will do */
						i			= 0;
						break;
				}

				n = notify(label, {
					icon:		icon,
					body:		text,
					tag:		"newmessages:" + this.name
				});

				n.onclick = function() {
					// TODO	On a notification or DM should we show the details
					//		when the notification is clicked?

					n.close();

					if (enyo.platform.firefoxOS) {
						/* Launch the application in case it isn't visible */
						var req = window.navigator.mozApps.getSelf();
						req.onsuccess = function() {
							if (req.result) {
								console.log(req.result);
								req.result.launch();
							}
						};
					}

					/* Ask the 'main' kind to show the column */
					this.doShowPanel({
						name: this.name
					});
				};
			}
		}
	}

	/*
		Merge split messages?

		If a new message is a reply to another message in the list  from the
		same sender then merge them into one.

		The assumption being that they are one message that has been split to
		get around character limits.

		For now this only works if all of the messages arrive in one refresh.
	*/
	for (var y = results.length - 1, first; first = results[y]; y--) {
		var original	= null;
		var lastIndex	= NaN;
		var matchid, user;

		if (!first.user || !first.user.id) {
			continue;
		}

		matchid = first.id;
		user = first.user.id;

		for (var x = y - 1, next; next = results[x]; x--) {
			if (!next.replyto || next.replyto !== matchid) {
				/* Each part should be a reply to the previous part */
				continue;
			}

			if (!next.user || next.user.id !== user) {
				/* Each part should be from the same user */
				continue;
			}

			/* Find and strip the "x of y:" prefixes */
			var ni	= next.text.search(/[0-9]+\s*\w*\s*[0-9]+:/);
			var fi	= first.text.search(/[0-9]+\s*\w*\s*[0-9]+:/);

			if (-1 == ni || -1 == fi) {
				/* No prefix... */
				continue;
			}

			if (next.text.slice(0, ni) !== first.text.slice(0, fi)) {
				/*
					The value before the prefixes don't match, which
					means this likely isn't the same message.
				*/
				continue;
			}

			/* The next part needs to match the ID of this one */
			matchid = next.id;

			/*
				Leave the "x of y" on the start of the merged message
				for now because there may be more than just 2 parts to
				this message. It needs that to match the next one.
			*/
			first.text = [
				first.text,
				next.text.replace(/.*[0-9]+\s*\w*\s*[0-9]+:/, '')
			].join(' ');

			/*
				Cleanup the stripped text too.
			*/
			first.stripped = [
				first.stripped,
				next.stripped.replace(/.*[0-9]+\s*\w*\s*[0-9]+:/, '')
			].join(' ');

			/*
				Use the newer message's ID so that the next refresh
				will get things newer than it.
			*/
			first.id = next.id;

			/* Replace first with a dummy message */
			results.splice(isNaN(lastIndex) ? y : lastIndex, 1, { junk: true });

			/* Put the combined message in the spot of the new one */
			results.splice(x, 1, first);
			lastIndex = x;

			/* Adjust the newcount too */
			newcount--;
		}

		if (!isNaN(lastIndex)) {
			/*
				Now that we are done searching for matches strip the
				"x of y" text from the merged message.
			*/
			results[lastIndex].text = results[lastIndex].text.replace(/[0-9]+\s*\w*\s*[0-9]+:/, '');
			results[lastIndex].stripped = results[lastIndex].stripped.replace(/[0-9]+\s*\w*\s*[0-9]+:/, '');
		}

		/* Cleanup */
		for (var i = results.length - 1, msg; msg = results[i]; i--) {
			if (msg.junk) {
				results.splice(i, 1);
			}
		}
	}

	if (newcount > 0) {
		/* Insert a new newcount indicator */
		changed = true;

		/* Adjust the scroll position (topIndex) based on the new item count */
		if (isNaN(newCountIndex) || newCountIndex <= topIndex) {
			if (topIndex > 0) {
				/*
					If the list is currently at the top then show the new count
					indicator. Otherwise leave the scroll position alone.
				*/
				topIndex++;
			}

			topIndex += newcount;
		}

		/* Move the selected item based on the new item count */
		this.move(newcount + 1, isNaN(newCountIndex) ? 0 : newCountIndex);

		if (isNaN(newCountIndex)) {
			newCountIndex = this.unseen;
		} else {
			newCountIndex += this.unseen;
		}

		this.results.splice(newCountIndex, 0, {
			newcount:	newcount
		});

		this.unseen = newcount;
	}

	if (results.length) {
		changed = true;

		if (isNaN(insertIndex)) {
			this.results = results.concat(this.results);
		} else {
			for (var i = 0, r; r = results[i]; i++) {
				this.results.splice(insertIndex + i, 0, r);
			}
		}

		if (topIndex >= this.results.length) {
			topIndex = 0;
		}

		if (!isNaN(newCountIndex)) {
			newCountIndex += results.length;
		}

		setTimeout(enyo.bind(this, function() {
			/* Scroll to the oldest new messages */
			this.lastActivity = new Date();
			// console.log(this.resource, 'Scroll to: ' + topIndex);

			this.$.list.scrollToRow(topIndex);

			/*
				Flush any old results to keep the total number of loaded messages
				sane.

				Twitter will never return more than 200 results, so keep a few extra
				for context.
			*/
			if (isNaN(insertIndex) && this.results.length > 205) {
				this.results.splice(205);
			}

			this.writeCache();
			this.loading = false;
		}), 300);
	} else {
		this.loading = false;
	}

	if (this.results.length == 0) {
		changed = true;

		this.results.unshift({
			empty:		true
		});
	} else {
		var last = this.results[this.results.length - 1];

		if (last && !last.loadmore) {
			this.results.push({
				loadmore:	true
			});
		}
	}

	if (changed) {
		this.$.list.setCount(this.results.length);
		this.$.list.refresh();
	}

	if (this.pulled) {
		this.$.list.completePull();
		this.pulled = false;
	}

	this.doRefreshStop({
		count:		!isNaN(newCountIndex) ? newCountIndex : 0
	});
	this.lastActivity = new Date();

	this.setTimer();
},

writeCache: function()
{
	if (!this.cache) {
		return;
	}

	/*
		Cache the most recent items

		Do not include the new count indicator. Gap indicators are okay
		though.
	*/
	var cache = this.results.slice(0, 35);

	for (var i = cache.length - 1, c; c = cache[i]; i--) {
		if (!c.id && !c.gap) {
			cache.splice(i, 1);
		}
	}

	prefs.set('cachedmsgs:' + this.user.id + ':' + this.resource, cache);
},

setTimer: function()
{
	if (enyo.platform.firefoxOS) {
		/* Clear all alarms scheduled for this column */
		var req = navigator.mozAlarms.getAll();

		req.onsuccess = function() {
			for (var i = 0, alarm; alarm = req.result[i]; i++) {
				if (alarm.data.name === this.name) {
					navigator.mozAlarms.remove(alarm.id);
				}
			}
			this._setTimer();
		}.bind(this);
	} else {
		clearTimeout(this.timeout);
		this._setTimer();
	}
},

_setTimer: function()
{
	var time	= this.refreshTime;
	var at;

	if (isNaN(time) || time < 1) {
		return;
	}

	/* Save a timestamp of the expected time to refresh */
	at = new Date((+new Date()) + (time * 1000));
	prefs.set('refreshAt:' + this.name, at.toString());

	// console.log(this.resource, 'Refresh ' + this.name + ' in ' + time + ' seconds');
	if (enyo.platform.firefoxOS) {
		/*
			On firefox OS alarms are used, so that we can check for new messages
			even if the app isn't loaded.
		*/
		navigator.mozAlarms.add(at, 'honorTimezone', {
			name:	this.name,
			action:	"refresh"
		});
	} else {
		this.timeout = setTimeout(function() {
			this.log(this.resource, 'Refreshing...');
			this.refresh(true);
		}.bind(this), time * 1000);
	}
},

itemTap: function(sender, event)
{
	var item	= this.results[event.index];
	var convo	= null;

	if (!item) {
		return;
	}

	this.doActivity({});

	if (item.dm) {
		/*
			All of the relevant messages are already in this.results, so filter
			them and build a conversation list.
		*/
		var senderid;
		convo = [];

		if (item.user.id !== this.user.id) {
			senderid = item.user.id;
		} else {
			senderid = item.recipient.id;
		}

		for (var i = 0, r; r = this.results[i]; i++) {
			if (!r.user || !r.recipient) {
				continue;
			}

			if (senderid === r.user.id ||
				senderid === r.recipient.id
			) {
				convo.push(r);
			}
		}
	}

	if (item.id) {
		this.doOpenToaster({
			component: {
				kind:				"MessageDetails",
				item:				item,
				user:				this.user,
				convo:				convo,

				onMessageAction:	"itemAction"
			},

			options:{
				notitle:			true,
				owner:				this,
				type:				"MessageDetails",
				instant:			event.instant
			}
		});
	} else if (item.gap) {
		this.refresh(false, event.index);
	} else if (item.loadmore) {
		this.refresh(false, event.index);
	}
},

itemAction: function(sender, event)
{
	var item;

	for (var i = 0; item = this.results[i]; i++) {
		if (item.id === event.item.id) {
			break;
		}
	}

	if (!item) {
		return;
	}

	switch (event.action) {
		case "favorite":
			item.favorited = true;
			this.writeCache();
			break;

		case "unfavorite":
			item.favorited = false;
			if (this.resource !== "favorite") {
				this.writeCache();
				break;
			}

			/* Treat this like a delete, fallthrough */

		case "delete":
			this.results.splice(i, 1);

			this.$.list.setCount(this.results.length);
			this.$.list.refresh();

			this.writeCache();
			break;

	}
},

setupItem: function(sender, event)
{
	var index		= event.index;
	var item		= this.results[index];
	var selected	= this.$.list.isSelected(index);
	var d;

	if (!item) {
		return;
	}

	if (!item.id) {
		this.$.message.setClasses('hide');
		this.$.msg.setClasses('listmsg');

		if (!isNaN(item.newcount)) {
			this.$.msg.setContent($L.format(this.service.terms.NewMessages, { n: item.newcount }, item.newcount));
			this.$.msg.addClass('newcount');
		} else if (item.gap) {
			this.$.msg.setContent(this.service.terms.LoadMissing);
			this.$.msg.addClass('gap');
		} else if (item.empty) {
			this.$.msg.setContent(this.service.terms.NoMessages);
			this.$.msg.addClass('nomsgs');
		} else if (item.loadmore) {
			this.$.msg.setContent(this.service.terms.LoadMore);
			this.$.msg.addClass('loadmore');
		} else if (item.loadFailed) {
			this.$.msg.setContent(this.service.terms.LoadFailed);
			this.$.msg.addClass('loadfailed');
		}

		return;
	}

	if (this.$.message.id === item.id && this.$.message.selected === selected) {
		/* Already setup */
		return;
	}

	this.$.message.id		= item.id;
	this.$.message.selected	= selected;

	this.$.msg.setClasses('hide');
	this.$.msg.setContent('');
	this.$.message.setClasses('message');

	this.$.message.addRemoveClass('favorite', item.favorited);
	this.$.message.addRemoveClass('selected', selected);

	this.$.message.setupMessage(item, this.service, function() {
		/* Tell the list to re-render the row on change */
		this.$.list.renderRow(index);
	}.bind(this));
},

clear: function()
{
	this.$.list.getSelection().clear();
},

move: function(x, position)
{
	var selection	= this.$.list.getSelection();
	var selected	= selection.getSelected();
	var index		= NaN;

	for (var name in selected) {
		index = name * 1;
	}

	if (isNaN(index)) {
		index = -1;
	} else if (!isNaN(position) && index > position) {
		return;
	}

	index += x;

	try {
		while (!this.results[index].id) {
			/* This is an indicator */
			index += (x > 0 ? 1 : -1);
		}
	} catch (e) {
	}

	this.select(index);
},

select: function(index)
{
	var selection	= this.$.list.getSelection();

	if (index < 0) {
		index = 0;
	}

	if (index >= this.results.length) {
		index = this.results.length - 1;
	}

	selection.select(index);
	this.$.list.scrollToRow(index - 1);
},

open: function(index, instant)
{
	var selection	= this.$.list.getSelection();
	var selected	= selection.getSelected();

	if (isNaN(index)) {
		for (var name in selected) {
			index = name * 1;
		}
	}

	if (isNaN(index)) {
		return(false);
	}

	this.itemTap(this, { index: index, instant: instant });
	return(true);
},

smartscroll: function()
{
	if (0 == this.$.list.getScrollTop()) {
		this.$.list.scrollToBottom();
	} else {
		this.$.list.scrollToTop();
	}
	this.handleActivity();
},

handleActivity: function(sender, event)
{
	var top = this.$.list.getScrollTop();

	/*
		Hide the "pull to refresh" text during normal scrolling. It should only
		be visible when the list is pulled down.

		This sets a style which changes the opacity of the "pull to refresh"
		text to 0. Setting display: none; breaks the behavior, but setting the
		opacity does not.
	*/
	if (top >= 0) {
		this.addClass('hide-puller');
	} else {
		this.removeClass('hide-puller');
	}

	if (!this.loading && this.lastScrollTop != top) {
		if (((new Date()) - this.lastActivity) > 1500) {
			this.doActivity({});
		}

		this.lastScrollTop	= top;
		this.userIsActive	= true;
	}
}

});

