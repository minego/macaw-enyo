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
	label:								null
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
		onPullRelease:					"pullRelease",
		onPullComplete:					"pullComplete",

		horizontal:						"hidden",
		vertical:						"scroll",

		thumb:							true,
		enableSwipe:					false,
		noSelect:						true,

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

	this.results = [];

	/* Load cached messages */
	var results;

	if (false && this.cache) {
		results = prefs.get('cachedmsgs:' + this.user.id + ':' + this.resource) || [];
	} else {
		results = [];
	}

	this.service.cleanupMessages(results);

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
	if (!this.pulled) {
		this.pulled = true;

		setTimeout(enyo.bind(this, function() {
			this.refresh();
		}), 500);
	}
},

pullComplete: function()
{
	this.$.list.reset();
	this.pulled = false;
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
		return;
	}

	if (autorefresh && this.loaded) {
		var now		= new Date();
		var elapsed	= now - this.loaded;

		if ((elapsed / 1000) < this.refreshTime) {
			this.log('Auto refresh tried to run too soon...', elapsed, now, this.loaded);

			return;
		}
	}

	if (!autorefresh) {
		this.unseen = 0;
	}

	this.loading = true;
	this.doRefreshStart();

	var params = {
		include_entities:		true
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
		this.gotMessages(success, results, autorefresh, index);
	}), params);
},

/* Scroll the list by the specified offset */
scroll: function(offset)
{
	var top = this.$.list.getScrollTop();

	this.$.list.setScrollTop(top + offset);
	this.handleActivity();
},

gotMessages: function(success, results, autorefresh, insertIndex)
{
	var		changed			= false;
	var		newCountIndex	= NaN;
	var		reverseScroll	= false;
	var		oldLength		= this.results.length;

	if (this.destroyed) {
		/*
			This can happen if the tabs are rebuilt while a refresh is in
			progress.
		*/
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

	/* Find the newcount indicator */
	for (var i = 0, t; t = this.results[i]; i++) {
		if (t.newcount) {
			newCountIndex = i;
			break;
		}
	}

	/* Remove the previous newcount indicator */
	if (!isNaN(newCountIndex)) {
		if (newCountIndex < insertIndex) {
			insertIndex--;
		}

		this.results.splice(newCountIndex, 1);
		newCountIndex = NaN;

		changed = true;
	}

	/* Remove the "no messages" indicator */
	if (this.results.length > 0 && this.results[0].empty) {
		this.results = [];
		newCountIndex	= NaN;
		insertIndex		= NaN;

		changed = true;
	}

	if (!success) {
		/* Failed */
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
	this.log(this.resource, 'Post-gap detection: There are ' + this.results.length + ' existing messages and ' + results.length + ' new messages');

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
		var max = 3;

		if (autorefresh && newcount > 0) {
			for (var i = Math.min(3, newcount), item; item = results[--i]; ) {
				var label	= null;
				var text	= null;
				var icon	= null;

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
						max			= 1;
						break;
				}

				if (!this.notifications) {
					this.notifications = [];
				}

				this.notifications.unshift(notify(icon, label, text));
			}
		}

		/* Never display more than 3 notifications per panel */
		if (this.notifications) {
			while (this.notifications.length > max) {
				var n = this.notifications.pop();

				n.cancel();
			}
		}
	}


	if (newcount > 0) {
		/* Insert a new newcount indicator */
		changed = true;

		this.results.splice(this.unseen, 0, {
			newcount:	newcount
		});

		newCountIndex = this.unseen;
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

		if (!isNaN(newCountIndex)) {
			newCountIndex += results.length;
		}

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

		/* Scroll to the oldest new messages */
		setTimeout(enyo.bind(this, function() {
			var oldtop = this.$.list.getScrollTop();

			if (results.length && oldLength > 0) {
				var dest = results.length;

				if (reverseScroll) {
					/* Scroll to the first new, not the last */
					dest = this.results.length - results.length;
					dest--;
				} else if (!isNaN(insertIndex)) {
					dest += insertIndex;
				}

				this.log(this.resource, 'Scrolling to: ' + dest);
				this.$.list.scrollToRow(dest - (autorefresh ? 0 : 1));

				/*
					Scroll down just a bit to show that there is another message
					above this one.
				*/
				setTimeout(enyo.bind(this, function() {
					var top = this.$.list.getScrollTop();

					if (autorefresh) {
						/* Preserve the original scroll position */
						top += oldtop;
					}

					if (!autorefresh || oldtop <= 35) {
						if (top > 35) {
							top -= 35;
						} else {
							top = 0;
						}
					}

					this.$.list.setScrollTop(top);
				}), 30);
			} else {
				this.$.list.scrollToRow(0);
			}
		}), 500);
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
	}
	this.loading = false;

	this.doRefreshStop({
		count:		!isNaN(newCountIndex) ? newCountIndex : 0
	});

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
	clearTimeout(this.timeout);

	if (isNaN(this.refreshTime) || this.refreshTime < 1) {
		return;
	}

	this.log(this.resource, 'Setting timer to refresh ' + this.refreshTime + ' from now');
	this.timeout = setTimeout(function() {
		this.log(this.resource, 'Refreshing...');
		this.refresh(true);
	}.bind(this), this.refreshTime * 1000);
},

itemTap: function(sender, event)
{
	var item	= this.results[event.index];

	if (!item) {
		return;
	}

	this.doActivity({});

	if (item.id) {
		this.doOpenToaster({
			component: {
				kind:				"MessageDetails",
				item:				item,
				user:				this.user,

				onMessageAction:	"itemAction"
			},

			options:{
				notitle:			true,
				owner:				this
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
	var item	= this.results[event.index];
	var d;

	if (!item) {
		return;
	}

	if (item.id && this.$.message.id === item.id) {
		/* Already setup */
		return;
	}

	if (!item.id) {
		this.$.message.setClasses('hide');
		this.$.msg.setClasses('listmsg');

		if (item.newcount) {
			if (item.newcount > 1) {
				this.$.msg.setContent(item.newcount + ' new ' + this.service.terms.message);
			} else {
				this.$.msg.setContent(item.newcount + ' new ' + this.service.terms.messages);
			}

			this.$.msg.addClass('newcount');
		} else if (item.gap) {
			this.$.msg.setContent('Tap to load missing ' + this.service.terms.messages);
			this.$.msg.addClass('gap');
		} else if (item.empty) {
			this.$.msg.setContent('No ' + this.service.terms.messages);
			this.$.msg.addClass('nomsgs');
		} else if (item.loadmore) {
			this.$.msg.setContent('Tap to load more ' + this.service.terms.messages);
			this.$.msg.addClass('loadmore');
		}

		return;
	}
	this.$.message.id = item.id;

	this.$.msg.setClasses('hide');
	this.$.msg.setContent('');

	this.$.message.setClasses('message');

	if (item.favorited) {
		this.$.message.addClass('favorite');
	} else {
		this.$.message.removeClass('favorite');
	}

	this.$.message.setupMessage(item, this.service);
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
	*/
	if (top >= 0) {
		this.addClass('hide-puller');
	} else {
		this.removeClass('hide-puller');
	}

	if (!this.loading && this.lastScrollTop != top) {
		this.doActivity({});
		this.lastScrollTop = top;
	}
}

});

