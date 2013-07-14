imagedata = {};

imagedata.get = function(src, cb)
{
	var image = new Image();

	image.onload = function()
	{
		var canvas	= document.createElement('canvas');
		var context	= canvas.getContext('2d');
		var data;

		canvas.width	= image.width;
		canvas.height	= image.height;
		context.drawImage(image, 0, 0);

		data = context.getImageData(0, 0, image.width, image.height);
		// console.log('image data: ', data);

		cb(data);
	};

	image.src = src;
};
