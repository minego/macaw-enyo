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

name:									"TweetList",
classes:								"tweetlist enyo-fit",

published: {
	user:								null,
	twitter:							null,
	resource:							"home",

	refreshTime:						-1,
	notify:								false,
	cache:								false
},

events: {
	onRefreshStart:						"",
	onRefreshStop:						"",
	onOpenToaster:						"",
	onActivity:							""
},

handlers: {
	onScrollStart:						"handleActivity",
	onScrollStop:						"handleActivity"
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
			classes:					"tweetitem",

			components: [{
				name:					"msg",
				classes:				"hide"
			}, {
				name:					"tweet",
				kind:					"Tweet"
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

	if (!this.twitter && this.user) {
		if (this.user.twitter) {
			this.twitter = this.user.twitter;
		} else {
			this.twitter = new TwitterAPI(this.user);
		}
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

	/* Load cached tweets */
	var results;

	if (this.cache) {
		results = prefs.get('cachedtweets:' + this.user.user_id + ':' + this.resource) || [];
	} else {
		results = [];
	}

	this.twitter.cleanupTweets(results);

	if (results && results.length) {
		this.loading = true;
		this.doRefreshStart();

		this.gotTweets(true, results);
	} else {
		this.refresh();
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

	index is the offset where the new tweets should be inserted.
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
			if (this.results[i] && this.results[i].id_str) {
				params.since_id = this.results[i].id_str;
				this.sinceIndex = i;
				break;
			}
		}

		if (!params.since_id) {
			/* Really? The most recent 5 items didn't have an id? Weird... */
			while (this.results.length && !this.results[0].id_str) {
				this.results.splice(0, 1);
			}

			if (this.results.length && this.results[0].id_str) {
				params.since_id = this.results[0].id_str;
			}
		}

		/* Load as many as possible to avoid gaps, max allowed is 200 */
		params.count = 200;
	} else {
		/*
			We're either trying to load tweets at the end of the list, or trying
			to fill a gap.
		*/
		var prev	= this.results[index - 1];
		var next	= this.results[index + 1];

		if (prev && prev.id_str) {
			params.max_id = prev.id_str;
		}

		if (next && next.id_str) {
			params.since_id = next.id_str;
		} else {
			params.count = 50;
		}
	}

	this.twitter.getTweets(this.resource, enyo.bind(this, function(success, results) {
		this.gotTweets(success, results, autorefresh, index);
	}), params);
},

scroll: function(offset)
{
	var top = this.$.list.getScrollTop();

	this.$.list.setScrollTop(top + offset);
	this.handleActivity();
},

gotTweets: function(success, results, autorefresh, insertIndex)
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
		if (!this.results[insertIndex].id_str) {
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

	/* Remove the "no tweets" indicator */
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
	// this.log(this.resource, 'Pre-gap  detection: There are ' + this.results.length + ' existing tweets and ' + results.length + ' new tweets');
	if (this.results.length > 0 && results.length > 0) {
		for (var n = 0, ni; ni = results[n]; n++) {
			for (var o = 0, oi; oi = this.results[o]; o++) {
				if (ni.id_str === oi.id_str) {
					/* We found a matching item, anything older is a duplicate */
					// this.log(this.resource, 'Removing duplicates from: ' + ni.id_str);
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
					before:	this.results[0].id_str,
					after:	results[results.length - 1].id_str
				}
			});
		}
	}
	this.log(this.resource, 'Post-gap detection: There are ' + this.results.length + ' existing tweets and ' + results.length + ' new tweets');

	if (results.length && this.results.length && isNaN(insertIndex)) {
		/* Insert a new newcount indicator */
		changed = true;
		this.results.unshift({
			newcount:	results.length
		});

		newCountIndex = 0;
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
			Flush any old results to keep the total number of loaded tweets sane

			Twitter will never return more than 200 results, so keep a few extra
			for context.
		*/
		if (isNaN(insertIndex) && this.results.length > 205) {
			this.results.splice(205);
		}

		this.writeCache();

		/* Scroll to the oldest new tweet */
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
					Scroll down just a bit to show that there is another tweet
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
		if (!c.id_str && !c.gap) {
			cache.splice(i, 1);
		}
	}

	prefs.set('cachedtweets:' + this.user.user_id + ':' + this.resource, cache);
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

	if (item.id_str) {
		this.doOpenToaster({
			component: {
				kind:			"TweetDetails",
				item:			item,
				user:			this.user,
				twitter:		this.twitter,

				onTweetAction:	"itemAction"
			},

			options:{
				notitle:		true,
				owner:			this
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
		if (item.id_str === event.item.id_str) {
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

	if (item.id_str && this.$.tweet.id_str === item.id_str) {
		/* Already setup */
		return;
	}

	if (!item.id_str) {
		this.$.tweet.setClasses('hide');
		this.$.msg.setClasses('tweetmsg');

		if (item.newcount) {
			if (item.newcount > 1) {
				this.$.msg.setContent(item.newcount + ' new tweets');
			} else {
				this.$.msg.setContent(item.newcount + ' new tweet');
			}

			this.$.msg.addClass('newcount');
		} else if (item.gap) {
			this.$.msg.setContent('Tap to load missing tweets');
			this.$.msg.addClass('gap');
		} else if (item.empty) {
			this.$.msg.setContent('No tweets');
			this.$.msg.addClass('notweets');
		} else if (item.loadmore) {
			this.$.msg.setContent('Tap to load more tweets');
			this.$.msg.addClass('loadmore');
		}

		return;
	}
	this.$.tweet.id_str = item.id_str;

	this.$.msg.setClasses('hide');
	this.$.msg.setContent('');

	this.$.tweet.setClasses('tweet');

	if (item.favorited) {
		this.$.tweet.addClass('favorite');
	} else {
		this.$.tweet.removeClass('favorite');
	}

	this.$.tweet.setupTweet(item);
},

smartscroll: function()
{
	if (0 == this.$.list.getScrollTop()) {
		this.$.list.scrollToBottom();
	} else {
		this.$.list.scrollToTop();
	}
},

handleActivity: function(sender, event)
{
	var top = this.$.list.getScrollTop();

	if (!this.loading && this.lastScrollTop != top) {
		this.doActivity({});
		this.lastScrollTop = top;
	}
}

});

