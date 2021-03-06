var supertest = require('supertest');
/*
 * Split one of API Gateway's weird param strings into a real javascript object
 * @param {string} paramString Looks like {b=apple, bob=dole}
 */
function splitParams(paramString) {
	var obj = {};

	if ( typeof paramString !== "undefined" ){
		paramString
			.substring(1, paramString.length - 1) //strip off { and }
			.split(", ")
			.forEach(function(keyVal) {
				var pieces = keyVal.split("=");
				var key = pieces[0],
					val = pieces[1];

				//Force "true" and "false" into Boolean
				if (val === "true") val = true;
				if (val === "false") val = false;

				obj[key] = val;
			});
	}

	return obj;
};


/*
 * Generate a somewhat normal path
 */
function reconstructUrl(request) {
	var path = request["resource-path"];

	//Append query string
	if (Object.keys(request.queryParams).length > 0) {
		var str = [];
		for (var p in request.queryParams) {
			if (request.queryParams.hasOwnProperty(p) && p != '') {
				str.push(p + "=" + request.queryParams[p]);
			}
		}
		if ( str.length > 0 ){
			path += "?" + str.join("&");
		}
	}

	//Fix path parameters
	if (Object.keys(request.pathParams).length > 0) {
		for (var param in request.pathParams) {
			if (request.pathParams.hasOwnProperty(param)) {
				var toReplace = "{" + param + "}";
				path = path.replace(toReplace, request.pathParams[param]);
			}
		}
	}

	return path;
}
function mapEvent( event ){
	var request = event;

	request.queryParams = {};

	if (typeof request.queryString !== "undefined"){
		request.queryParams = splitParams(request.queryString);
	}

	if (typeof request.headers !== "undefined"){
		request.headers = splitParams(request.headers);
		request.headers["user-agent"] = request["user-agent"];
	}
	request.pathParams = splitParams(request.pathParams);

	request.method = request["http-method"];
	request.url = reconstructUrl(request);
	
	delete request.allParams;
	delete request.queryString;

	return request;
}

var legerdemain = function( event, context ){

	var data = mapEvent( event );	

	supertest(this)
		.get( data.url )
		.end( function( err, response ){
			if ( err ){
				console.log( err );
				context.fail( err );
			} else {
				var data = response.text,
		    		statusCode = response.statusCode;		    	

				if ( statusCode > 399 ){
		    		var err = new Error( statusCode );
		    		context.fail( err );
		    	} else {
		    		context.succeed({data : data});
		    	}
		    }
		});
}

module.exports = legerdemain;