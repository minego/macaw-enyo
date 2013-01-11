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

name:									"TweetDetails",
classes:								"tweetdetails",

published: {
	user:								null,
	item:								null,
	twitter:							null
},

components: [
	{
		name:							"tweet",
		classes:						"tweet",
		components: [
			{
				name:					"avatar",
				classes:				"avatar"
			},
			{
				name:					"screenname",
				classes:				"screenname"
			},
			{
				name:					"username",
				classes:				"username"
			},
			{
				tag:					"br"
			},
			{
				name:					"text",
				classes:				"text",
				allowHtml:				true
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	if (!this.twitter) {
		this.twitter = new TwitterAPI(this.user);
	}

	var user = this.item.user || this.item.sender;

	this.$.screenname.setContent('@' + user.screen_name);
	this.$.username.setContent(user.name);

	this.$.avatar.applyStyle('background-image', 'url(' + user.profile_image_url + ')');

	this.$.text.setContent(this.item.text);
}

});

