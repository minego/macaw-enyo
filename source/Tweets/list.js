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
	resource:							"home",

	refreshTime:						-1,
	notify:								false,

    rowsPerPage:                        50 /* This is supposed to be overridden by webOSPhoneTweetList below... */
},

events: {
	onRefreshStart:						"",
	onRefreshStop:						""
},

components: [
],

create: function()
{
	this.inherited(arguments);

	this.twitter = new TwitterAPI(this.user);
    this.createComponent({
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

        rowsPerPage:					this.rowsPerPage,

		components: [{
			name:						"tweet",
			kind:						"Tweet"
		}, {
			name:						"msg",
			classes:					"hide"
		}]
	}, { owner: this });
},

destroy: function()
{
	clearTimeout(this.timeout);

	this.inherited(arguments);
},

importProps: function(inProps) {
    this.inherited(arguments);
},

rendered: function()
{
	this.inherited(arguments);

	this.results = [];

	/* Load cached tweets */
	var results = prefs.get('cachedtweets:' + this.user.user_id + ':' + this.resource) || [];

	this.twitter.cleanupTweets(results);

	// Testing... Remove the most recent entries from the cached results so that
	// we can immediately load them again as if they where new.
	// results.splice(0, 5);

	if (results && results.length) {
		this.loading = true;
		this.doRefreshStart();

		this.log('Loaded ' + results.length + ' tweets from the cache', this.resource);
		this.gotTweets(true, results);
	} else {
		this.log('Refreshing', this.resource);
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

refresh: function(keepnew)
{
	this.setTimer();

	if (this.loading) {
		return;
	}

	if (keepnew && this.loaded) {
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

	if (this.results.length) {
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
		/* Load a reasonable amount */
		params.count = 50;
	}

	this.twitter.getTweets(this.resource, enyo.bind(this, function(success, results) {
		this.gotTweets(success, results, keepnew);
	}), params);
},

gotTweets: function(success, results, keepnew)
{
	var		changed			= false;
	var		newCountIndex	= NaN;

	if (this.destroyed) {
		/*
			This can happen if the tabs are rebuilt while a refresh is in
			progress.
		*/
		return;
	}

	/* Keep track of when we last loaded */
	this.loaded = new Date();

	/* Find the newcount indicator */
	for (var i = 0, t; t = this.results[i]; i++) {
		if (t.newcount) {
			newCountIndex = i;
			break;
		}
	}

	/* Remove the previous newcount indicator */
	if (!isNaN(newCountIndex) && !keepnew) {
		this.results.splice(newCountIndex, 1);
		newCountIndex = NaN;

		changed = true;
	}

	/* Remove the "no tweets" indicator */
	if (this.results.length > 0 && this.results[0].empty) {
		this.results.splice(0, 1);

		changed = true;
	}

	if (!success) {
		/* Failed */
		this.$.list.refresh();
		this.$.list.completePull();

		ex("Refresh failed");
		this.loading = false;
		this.doRefreshStop();

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
	this.log(this.resource, 'Pre-gap  detection: There are ' + this.results.length + ' existing tweets and ' + results.length + ' new tweets');
	if (this.results.length > 0 && results.length > 0) {
		for (var n = 0, ni; ni = results[n]; n++) {
			for (var o = 0, oi; oi = this.results[o]; o++) {
				if (ni.id_str === oi.id_str) {
					/* We found a matching item, anything older is a duplicate */
					this.log(this.resource, 'Removing duplicates from: ' + ni.id_str);
					match = true;
					results.splice(n);
					break;
				}
			}
		}

		if (match) {
			/* We found our match, there is no gap */
			this.log(this.resource, 'No gap, we had an overlap');
		} else {
			this.log(this.resource, 'Found a gap');
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

	if (keepnew && !isNaN(newCountIndex)) {
		/* Update the existing newcount indicator */
		if (results.length) {
			this.results[newCountIndex].newcount += results.length;

			changed = true;
		}
	} else if (results.length && this.results.length) {
		/* Insert a new newcount indicator */
		changed = true;
		this.results.unshift({
			newcount:	results.length
		});

		newCountIndex = 0;
	}

	if (results.length) {
		changed = true;
		this.results = results.concat(this.results);

		if (!isNaN(newCountIndex)) {
			newCountIndex += this.results.length;
		}

		/*
			Flush any old results to keep the total number of loaded tweets sane

			Twitter will never return more than 200 results, so keep a few extra
			for context.
		*/
		// TODO	We need to implement loading gaps, and allow loading tweets
		//		below the loaded timeline. In those cases this is obviously not
		//		the correct check to do.
		if (this.results.length > 205) {
			this.results.splice(205);
		}

		/*
			Cache the 20 most recent items

			Do not include the new count indicator. Gap indicators are okay
			though.
		*/
		var cache = this.results.slice(0, 20);

		for (var i = cache.length - 1, c; c = cache[i]; i--) {
			if (!c.id_str && !c.gap) {
				cache.splice(i, 1);
			}
		}

		prefs.set('cachedtweets:' + this.user.user_id + ':' + this.resource, cache);


		/* Scroll to the oldest new tweet */
		if (!keepnew) {
			setTimeout(enyo.bind(this, function() {
				if (!isNaN(newCountIndex) && newCountIndex > 1) {
					this.$.list.scrollToRow(newCountIndex - 1);

					/*
						Scroll down just a bit to show that there is another tweet
						above this one.
					*/
					setTimeout(enyo.bind(this, function() {
						var top = this.$.list.getScrollTop();
						if (top > 35) {
							this.$.list.setScrollTop(top - 35);
						} else {
							this.$.list.setScrollTop(0);
						}
					}), 30);
				} else {
					this.$.list.scrollToRow(0);
				}
			}), 500);
		}
	}

	if (this.results.length == 0) {
		changed = true;

		this.results.unshift({
			empty:		true
		});
	}

	if (changed) {
		this.$.list.setCount(this.results.length);
		this.$.list.refresh();
	}

	this.loading = false;
	this.doRefreshStop();

	if (this.pulled) {
		this.$.list.completePull();
	}
	this.setTimer();
},

setTimer: function()
{
	clearTimeout(this.timeout);

	if (isNaN(this.refreshTime) || this.refreshTime < 1) {
		return;
	}

	this.log(this.resource, 'Setting timer to refresh ' + this.refreshTime + ' from now');
	setTimeout(function() {
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

	this.log('Open a toaster with details for:', item.id_str);
	global.toasters.push({
		kind:			"TweetDetails",
		item:			item,
		user:			this.user,
		twitter:		this.twitter
	}, { });
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

	this.$.tweet.id_str = item.id_str;

	if (item.newcount) {
		if (item.newcount > 1) {
			this.$.msg.setContent(item.newcount + ' new tweets');
		} else {
			this.$.msg.setContent(item.newcount + ' new tweet');
		}

		this.$.tweet.setClasses('hide');
		this.$.msg.setClasses('newcount');
		return;
	}

	if (item.gap) {
		// TODO	When tapped load the gap
		this.$.msg.setContent('Tap to load missing tweets');

		this.$.tweet.setClasses('hide');
		this.$.msg.setClasses('gap');
		return;
	}

	if (item.empty) {
		this.$.msg.setContent('No tweets');

		this.$.tweet.setClasses('hide');
		this.$.msg.setClasses('gap');
		return;
	}

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
}

});

/*
    Right now we are just generalizing. This should probably be tweaked based on
	screen size.  Then we can use the device name + TweetList

	(i.e. Pre3TweetList, VeerTweetList, PreTweetList.
 */
enyo.kind({
    name:                               "webOSPhoneTweetList",
    kind:                               "TweetList",

    rowsPerPage:                        2
});

