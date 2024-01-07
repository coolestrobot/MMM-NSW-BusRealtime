/* Magic Mirror
 * Node Helper: MMM-NSW-NextBus
 *
 * By
 * MIT Licensed.
 */
var NodeHelper = require("node_helper");
// var fs = require("fs");
var moment = require("moment");

module.exports = NodeHelper.create({

	// Override socketNotificationReceived method.

	/* socketNotificationReceived(notification, payload)
	 * This method is called when a socket notification arrives.
	 *
	 * argument notification string - The identifier of the noitication.
	 * argument payload mixed - The payload of the notification.
	 */
	callCount: 0,
	callInProgress: false,
	socketNotificationReceived: function(notification, payload) {
		var self = this;

		if (notification === "CONFIG") {
			self.config = payload;
			self.getData();

			setInterval(function() {
				self.getData();
			}, self.config.updateInterval);
		} else if (notification === "GET_DATA") {
			console.log("socketNotificationReceived - GET_DATA");
			self.getData();
		}
	},



	/*
	 * getData
	 * function example return data and show it in the module wrapper
	 * get a URL request
	 */
	getData: function() {
		var self = this;
		self.callInProgress = false;  // DISABLE THIS FUNCTION.
		if (self.callInProgress){
			console.log("Call is still in progress");
			self.sendSocketNotification("PROCESSING", "Call is still in progress ");
		} else {
			var request = require("request");

//			curl -X GET --header 'Accept: application/json' 
//			--header 'Authorization: apikey 1Ax4vFWw5kjsa20Isti5aGmCItSLAAxlto0V' 
//			'https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG%3A4326&depArrMacro=dep&itdDate=20161016&itdTime=0800&type_origin=any&name_origin=10117225&type_destination=any&name_destination=212214&calcNumberOfTrips=6&TfNSWTR=true&version=10.2.1.42'
//curl -X GET --header 'Accept: application/json' --header 'Authorization: apikey 1Ax4vFWw5kjsa20Isti5aGmCItSLAAxlto0V' 'https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG%3A4326&depArrMacro=dep&itdDate=20161001&itdTime=1200&type_origin=any&name_origin=10101331&type_destination=any&name_destination=10102027&calcNumberOfTrips=6&excludedMeans=checkbox&exclMOT_4=1&exclMOT_7=1&exclMOT_9=1&exclMOT_11=1&TfNSWTR=true&version=10.2.1.42'
			var now = moment();
			var date = now.format("YYYYMMDD"); //"20181016";
			var time = now.format("HHmm"); //"2212"
			var fromStop = "10117225";
			var toStop = "212214";
			var numOfTrips = "6";

			// Uses the trip planner API
			// https://opendata.transport.nsw.gov.au/dataset/trip-planner-apis
			// The result comes back in JSON So there's no need for GTFS which makes things a lot simpler
			// The input is the bus stop ID from/to
			var url = "https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG%3A4326&depArrMacro=dep&" + 
					"itdDate=" + date + "&itdTime=" + time + "&type_origin=any&name_origin="
					+ fromStop + "&type_destination=any&name_destination=" + toStop + "&calcNumberOfTrips="
					+ numOfTrips + "&TfNSWTR=true&version=10.2.1.42&excludedMeans=checkbox&exclMOT_4=1&exclMOT_7=1&exclMOT_9=1&exclMOT_11=1";

			var requestSettings = {
				method: "GET",
				url: url,
				headers: {
					"Accept" : "application/json",
					"Authorization" : "apikey 1Ax4vFWw5kjsa20Isti5aGmCItSLAAxlto0V"
				},
				dataType: "json"
			};
			//New NSWBusTimes2024 API Key: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI1SlpZVnZBUV9mbUdjcER1aHQ0MzQwTFF0eXJEU1JHS3J0ZU16UGV3NmljIiwiaWF0IjoxNzA0NDk5NzYxfQ.bNKrVlID9zzwy-7mhgn-PJtDyJZhne49A58vTKIWhtM
			// Eastwood: 212210
			// Redfern: 201510

			self.callInProgress = true;
			self.cachedData = undefined;
			if (self.cachedData == undefined){
				//console.log("MP Request start");
				self.sendSocketNotification("PROCESSING", "Calling Transport NSW...");
				request(requestSettings, function (error, response, body) {
					if (!error && response.statusCode == 200) {
						//self.sendSocketNotification("PROCESSING", "Almost there...");
						// Json response
						console.log("MP Request complete");
						// var feed = GtfsRealtimeBindings.FeedMessage.decode(body);
						// if (self.useCachedData){
						// 	self.cachedData = feed; // uncomment if we want to start using cached data
						// }
						// console.log("Writing file to feed.json");
						// fs.writeFileSync("feed.json", JSON.stringify(feed));
						self.callInProgress = false;
 
						self.sendSocketNotification("DATA", body);
					} else {
						console.log("Error calling:", error, response.statusCode);
						self.sendSocketNotification("ERROR", body);
						self.callInProgress = false;
					}
				});
			} else {
				console.log("Using cached data...");
				self.sendSocketNotification("DATA", self.cachedData);
				self.callInProgress = false;
			}
		}
	}, 
	/*
	 * getData
	 * function example return data and show it in the module wrapper
	 * get a URL request
	 */
 
});
